import { and, eq } from "drizzle-orm";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import { db } from "../db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  users,
  type User,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCAL_PROVIDER_ID = "credentials";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const PASSWORD_HISTORY_LIMIT = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derivedKey = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");
  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}

function normalisePasswordHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .slice(0, PASSWORD_HISTORY_LIMIT);
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || "User";
}

function normalizeAvatarUrlForStorage(avatarUrl: string | null | undefined) {
  if (avatarUrl === undefined) return undefined;
  if (avatarUrl === null) return null;
  const trimmedAvatarUrl = avatarUrl.trim();
  if (!trimmedAvatarUrl) return null;
  if (trimmedAvatarUrl.length > 60000) {
    throw new Error(
      "Profile picture is too large. Please choose a smaller image or resize it before saving."
    );
  }
  return trimmedAvatarUrl;
}

// ---------------------------------------------------------------------------
// Auth table helpers
// ---------------------------------------------------------------------------

async function getAuthUserRecordById(id: string) {
  const result = await db.select().from(authUsers).where(eq(authUsers.id, id)).limit(1);
  return result[0] ?? null;
}

async function getAuthUserRecordByEmail(email: string) {
  const result = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, normalizeEmail(email)))
    .limit(1);
  return result[0] ?? null;
}

async function getLocalAuthAccountByUserId(userId: string) {
  const result = await db
    .select()
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, LOCAL_PROVIDER_ID)))
    .limit(1);
  return result[0] ?? null;
}

// ---------------------------------------------------------------------------
// Auth identity (links app user ↔ auth_user ↔ auth_account)
// ---------------------------------------------------------------------------

async function ensureAuthIdentityForUser(
  appUser: User,
  options?: {
    name?: string | null;
    email?: string | null;
    password?: string | null;
  }
) {
  const email = normalizeEmail(options?.email ?? appUser.email ?? "");
  if (!email) {
    throw new Error("User email is required for local authentication.");
  }

  const name = (options?.name ?? appUser.name ?? displayNameFromEmail(email)).trim();
  let authUser = appUser.authId ? await getAuthUserRecordById(appUser.authId) : null;

  if (!authUser) {
    authUser = await getAuthUserRecordByEmail(email);
  }

  if (!authUser) {
    const authUserId = randomUUID();
    await db.insert(authUsers).values({
      id: authUserId,
      name,
      email,
      emailVerified: false,
      image: null,
    });
    authUser = await getAuthUserRecordById(authUserId);
  } else if (authUser.name !== name || authUser.email !== email) {
    await db
      .update(authUsers)
      .set({ name, email })
      .where(eq(authUsers.id, authUser.id));
    authUser = await getAuthUserRecordById(authUser.id);
  }

  if (!authUser) {
    throw new Error("Failed to prepare authentication identity.");
  }

  if (appUser.authId !== authUser.id || appUser.email !== email || appUser.name !== name) {
    await db
      .update(users)
      .set({ authId: authUser.id, email, name })
      .where(eq(users.id, appUser.id));
  }

  let authAccount = await getLocalAuthAccountByUserId(authUser.id);
  if (!authAccount) {
    const nextPassword = options?.password?.trim() ? buildPasswordHash(options.password.trim()) : null;
    await db.insert(authAccounts).values({
      id: randomUUID(),
      userId: authUser.id,
      accountId: email,
      providerId: LOCAL_PROVIDER_ID,
      password: nextPassword,
      passwordHistory: [],
    });
    authAccount = await getLocalAuthAccountByUserId(authUser.id);
  } else if (authAccount.accountId !== email || options?.password) {
    const trimmedPassword = options?.password?.trim() ?? "";
    const isPasswordUpdate = Boolean(trimmedPassword);
    const currentPasswordHash = authAccount.password ?? null;
    const currentPasswordHistory = normalisePasswordHistory(authAccount.passwordHistory);

    if (isPasswordUpdate) {
      if (currentPasswordHash && verifyPasswordHash(trimmedPassword, currentPasswordHash)) {
        throw new Error("You cannot reuse your current password.");
      }
      if (currentPasswordHistory.some((storedHash) => verifyPasswordHash(trimmedPassword, storedHash))) {
        throw new Error("You cannot reuse a previous password.");
      }
    }

    const nextPasswordHash = isPasswordUpdate ? buildPasswordHash(trimmedPassword) : currentPasswordHash;
    const nextPasswordHistory = isPasswordUpdate
      ? [
          ...(currentPasswordHash ? [currentPasswordHash] : []),
          ...currentPasswordHistory,
        ].slice(0, PASSWORD_HISTORY_LIMIT)
      : currentPasswordHistory;

    await db
      .update(authAccounts)
      .set({ accountId: email, password: nextPasswordHash, passwordHistory: nextPasswordHistory })
      .where(eq(authAccounts.id, authAccount.id));
    authAccount = await getLocalAuthAccountByUserId(authUser.id);
  }

  const refreshedUser = await getUserById(appUser.id);
  if (!refreshedUser) {
    throw new Error("Failed to refresh application user after auth sync.");
  }

  return { appUser: refreshedUser, authUser, authAccount };
}

// ---------------------------------------------------------------------------
// User CRUD
// ---------------------------------------------------------------------------

export async function getOrCreateLocalDevUser(data: {
  email: string;
  name: string;
  role: "user" | "admin";
}): Promise<User> {
  const existing = await getUserByEmail(data.email);
  if (existing) {
    if (existing.role !== data.role || existing.name !== data.name) {
      await db
        .update(users)
        .set({ name: data.name, role: data.role, lastSignedIn: new Date() })
        .where(eq(users.email, data.email));
      const updated = await getUserByEmail(data.email);
      if (updated) return updated;
    }
    return existing;
  }

  await db.insert(users).values({
    authId: `local-${data.email}`,
    email: data.email,
    name: data.name,
    role: data.role,
    lastSignedIn: new Date(),
  });

  const created = await getUserByEmail(data.email);
  if (!created) {
    throw new Error("Failed to create local development user");
  }
  return created;
}

export async function getUserByAuthId(authId: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.authId, authId)).limit(1);
  return result[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>): Promise<void> {
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getAllUsers() {
  return db.select().from(users);
}

// ---------------------------------------------------------------------------
// App user lifecycle
// ---------------------------------------------------------------------------

export async function createAppUser(data: {
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  password?: string | null;
  loginEnabled?: boolean;
  mustChangePassword?: boolean;
}) {
  await db.insert(users).values({
    authId: null,
    name: data.name,
    email: normalizeEmail(data.email),
    loginEnabled: data.loginEnabled ?? true,
    mustChangePassword: Boolean(data.mustChangePassword),
    role: data.role,
    lastSignedIn: null,
  });

  const created = await getUserByEmail(data.email);
  if (!created) throw new Error("Failed to create user");

  if (data.password?.trim()) {
    const { appUser } = await ensureAuthIdentityForUser(created, {
      name: data.name,
      email: data.email,
      password: data.password.trim(),
    });
    return appUser;
  }
  return created;
}

export async function deleteAppUser(id: number) {
  const existing = await getUserById(id);
  await db.delete(users).where(eq(users.id, id));
  if (!existing) return;

  const authUser =
    (existing.authId ? await getAuthUserRecordById(existing.authId) : null) ??
    (existing.email ? await getAuthUserRecordByEmail(existing.email) : null);
  if (!authUser) return;

  await db.delete(authSessions).where(eq(authSessions.userId, authUser.id));
  await db.delete(authAccounts).where(eq(authAccounts.userId, authUser.id));
  await db.delete(authVerifications).where(eq(authVerifications.identifier, `password-reset:${authUser.id}`));
  await db.delete(authUsers).where(eq(authUsers.id, authUser.id));
}

export async function upsertAppUser(data: {
  authId: string;
  email: string;
  name: string | null;
  lastSignedIn: Date;
}): Promise<void> {
  await db
    .insert(users)
    .values({
      authId: data.authId,
      email: data.email,
      name: data.name,
      lastSignedIn: data.lastSignedIn,
      role: "user",
    })
    .onDuplicateKeyUpdate({
      set: { name: data.name, lastSignedIn: data.lastSignedIn },
    });
}

export async function updateAppUserWithAuth(
  id: number,
  data: {
    name?: string;
    email?: string;
    role?: "user" | "admin" | "super_admin";
    avatarUrl?: string | null;
    password?: string | null;
    loginEnabled?: boolean;
    mustChangePassword?: boolean;
  }
) {
  const existing = await getUserById(id);
  if (!existing) throw new Error("User not found.");

  await updateUser(id, {
    name: data.name?.trim() || undefined,
    email: data.email ? normalizeEmail(data.email) : undefined,
    role: data.role,
    avatarUrl: normalizeAvatarUrlForStorage(data.avatarUrl),
    loginEnabled: data.loginEnabled,
    mustChangePassword: data.mustChangePassword,
  });

  const updated = await getUserById(id);
  if (!updated) throw new Error("Failed to update user.");

  if (updated.authId || data.email || data.name || data.password?.trim()) {
    return ensureAuthIdentityForUser(updated, {
      name: data.name ?? updated.name,
      email: data.email ?? updated.email,
      password: data.password?.trim() || null,
    }).then((result) => result.appUser);
  }
  return updated;
}

export async function hasPasswordForUser(userId: number) {
  const appUser = await getUserById(userId);
  if (!appUser) throw new Error("User not found.");
  const authUser =
    (appUser.authId ? await getAuthUserRecordById(appUser.authId) : null) ??
    (appUser.email ? await getAuthUserRecordByEmail(appUser.email) : null);
  if (!authUser) return false;
  const account = await getLocalAuthAccountByUserId(authUser.id);
  return Boolean(account?.password);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function signInWithPassword(data: {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const email = normalizeEmail(data.email);
  const appUser = await getUserByEmail(email);
  if (!appUser) throw new Error("Invalid email or password.");
  if (appUser.loginEnabled === false) {
    throw new Error("This login has been suspended. Please contact TextPoint to restore access.");
  }

  const authUser =
    (appUser.authId ? await getAuthUserRecordById(appUser.authId) : null) ??
    (appUser.email ? await getAuthUserRecordByEmail(appUser.email) : null);
  if (!authUser) throw new Error("Invalid email or password.");

  const account = await getLocalAuthAccountByUserId(authUser.id);
  if (!account?.password || !verifyPasswordHash(data.password, account.password)) {
    throw new Error("Invalid email or password.");
  }

  const token = randomBytes(32).toString("hex");
  await db.insert(authSessions).values({
    id: randomUUID(),
    userId: authUser.id,
    token,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
  });

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, appUser.id));
  const refreshedUser = await getUserById(appUser.id);
  if (!refreshedUser) throw new Error("Failed to create session.");

  return { token, expiresAt: new Date(Date.now() + SESSION_TTL_MS), user: refreshedUser };
}

export async function signOutSession(token: string) {
  await db.delete(authSessions).where(eq(authSessions.token, token));
}

export async function getUserBySessionToken(token: string) {
  const result = await db.select().from(authSessions).where(eq(authSessions.token, token)).limit(1);
  const session = result[0];
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.delete(authSessions).where(eq(authSessions.id, session.id));
    return null;
  }

  let appUser = await getUserByAuthId(session.userId);
  if (appUser) {
    if (appUser.loginEnabled === false) {
      await db.delete(authSessions).where(eq(authSessions.id, session.id));
      return null;
    }
    return appUser;
  }

  const authUser = await getAuthUserRecordById(session.userId);
  if (!authUser) return null;

  appUser = await getUserByEmail(authUser.email);
  if (!appUser) return null;
  if (appUser.loginEnabled === false) {
    await db.delete(authSessions).where(eq(authSessions.id, session.id));
    return null;
  }

  await db.update(users).set({ authId: authUser.id }).where(eq(users.id, appUser.id));
  return getUserById(appUser.id);
}

export async function setUserLoginEnabled(userId: number, loginEnabled: boolean) {
  await updateUser(userId, { loginEnabled });
  const updated = await getUserById(userId);
  if (!updated) throw new Error("User not found.");

  if (!loginEnabled) {
    const authUser =
      (updated.authId ? await getAuthUserRecordById(updated.authId) : null) ??
      (updated.email ? await getAuthUserRecordByEmail(updated.email) : null);
    if (authUser) {
      await db.delete(authSessions).where(eq(authSessions.userId, authUser.id));
    }
  }
  return updated;
}

export async function setUserRole(email: string, role: "user" | "admin" | "super_admin"): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.email, email));
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email: string) {
  const appUser = await getUserByEmail(email);
  if (!appUser) {
    return { success: true, resetUrl: null as string | null };
  }

  const { authUser } = await ensureAuthIdentityForUser(appUser, { email, name: appUser.name });
  const identifier = `password-reset:${authUser.id}`;
  await db.delete(authVerifications).where(eq(authVerifications.identifier, identifier));

  const token = randomBytes(32).toString("hex");
  await db.insert(authVerifications).values({
    id: randomUUID(),
    identifier,
    value: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const baseUrl = ENV.appBaseUrl.replace(/\/$/, "");
  return { success: true, resetUrl: `${baseUrl}/reset-password?token=${token}` };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const hashedToken = hashResetToken(token);
  const result = await db.select().from(authVerifications).where(eq(authVerifications.value, hashedToken)).limit(1);
  const verification = result[0];
  if (!verification || new Date(verification.expiresAt).getTime() <= Date.now()) {
    throw new Error("This password reset link is invalid or has expired.");
  }

  const authUserId = verification.identifier.replace(/^password-reset:/, "");
  const authUser = await getAuthUserRecordById(authUserId);
  if (!authUser) throw new Error("This password reset link is invalid or has expired.");

  let appUser = await getUserByAuthId(authUser.id);
  if (!appUser) appUser = await getUserByEmail(authUser.email);
  if (!appUser) throw new Error("This password reset link is invalid or has expired.");

  await ensureAuthIdentityForUser(appUser, { name: appUser.name, email: authUser.email, password: newPassword });
  await updateUser(appUser.id, { mustChangePassword: false });
  await db.delete(authVerifications).where(eq(authVerifications.id, verification.id));
  await db.delete(authSessions).where(eq(authSessions.userId, authUser.id));
  return { success: true, userId: appUser.id };
}

export async function changeUserPassword(data: {
  userId: number;
  currentPassword?: string | null;
  newPassword: string;
}) {
  const appUser = await getUserById(data.userId);
  if (!appUser) throw new Error("User not found.");

  const { authUser, authAccount } = await ensureAuthIdentityForUser(appUser, {
    name: appUser.name,
    email: appUser.email,
  });

  if (authAccount?.password) {
    if (!data.currentPassword?.trim()) throw new Error("Current password is required.");
    if (!verifyPasswordHash(data.currentPassword.trim(), authAccount.password)) {
      throw new Error("Current password is incorrect.");
    }
  }

  await ensureAuthIdentityForUser(appUser, {
    name: appUser.name,
    email: appUser.email,
    password: data.newPassword,
  });

  await updateUser(appUser.id, { mustChangePassword: false });
  await db.delete(authVerifications).where(eq(authVerifications.identifier, `password-reset:${authUser.id}`));
  return { success: true, hadExistingPassword: Boolean(authAccount?.password) };
}
