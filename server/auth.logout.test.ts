import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME, LOCAL_AUTH_LOGOUT_COOKIE } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): {
  ctx: TrpcContext;
  appendHeaderCalls: { name: string; value: string }[];
} {
  const appendHeaderCalls: { name: string; value: string }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    email: "sample@example.com",
    name: "Sample User",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      appendHeader: (name: string, value: string) => {
        appendHeaderCalls.push({ name, value });
      },
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, appendHeaderCalls };
}

describe("auth.logout", () => {
  it("clears the session cookie and sets logout cookie", async () => {
    const { ctx, appendHeaderCalls } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toBeUndefined();
    const setCookieHeaders = appendHeaderCalls
      .filter((c) => c.name === "Set-Cookie")
      .map((c) => c.value);

    expect(setCookieHeaders.length).toBeGreaterThanOrEqual(2);

    const sessionClear = setCookieHeaders.find((h) => h.startsWith(`${COOKIE_NAME}=;`));
    expect(sessionClear).toBeDefined();

    const logoutCookie = setCookieHeaders.find((h) =>
      h.startsWith(`${LOCAL_AUTH_LOGOUT_COOKIE}=true;`)
    );
    expect(logoutCookie).toBeDefined();
  });
});
