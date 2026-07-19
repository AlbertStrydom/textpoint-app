import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME, LOCAL_AUTH_LOGOUT_COOKIE } from "../../shared/const";
import { ENV } from "./env";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getRequestPagePath(req: CreateExpressContextOptions["req"]) {
  const explicitPath = req.headers["x-textpoint-path"];
  if (typeof explicitPath === "string") {
    return explicitPath;
  }

  const referer = req.headers.referer;
  if (!referer) return "";

  try {
    return new URL(referer).pathname;
  } catch {
    return "";
  }
}

function isAuthPagePath(pathname: string) {
  return ["/login", "/forgot-password", "/reset-password", "/login-not-configured"].includes(pathname);
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookies = parseCookie(req.headers.cookie ?? "");
    const sessionToken = cookies[COOKIE_NAME];
    const localAuthBypassSuppressed = cookies[LOCAL_AUTH_LOGOUT_COOKIE] === "true";
    const localAuthBypassBlockedForPage = isAuthPagePath(getRequestPagePath(req));

    if (sessionToken) {
      user = await db.getUserBySessionToken(sessionToken);
    }

    if (
      !user &&
      ENV.localAuthBypass &&
      !ENV.isProduction &&
      !localAuthBypassSuppressed &&
      !localAuthBypassBlockedForPage
    ) {
      user = await db.getOrCreateLocalDevUser({
        email: ENV.localAuthEmail,
        name: ENV.localAuthName,
        role: "super_admin",
      });
    }
  } catch (err) {
    logger.warn({ err }, "Failed to initialise local development user");
  }

  return { req, res, user };
}
