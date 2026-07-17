import { describe, expect, it } from "vitest";
import { evaluateEnvironmentReadiness, type Env } from "./env";

const baseEnv: Env = {
  betterAuthSecret: "super-secret-value",
  appBaseUrl: "https://textpoint.example.org",
  databaseUrl: "mysql://user:pass@db:3306/textpoint",
  forgeApiUrl: undefined,
  forgeApiKey: undefined,
  localAuthBypass: false,
  localAuthEmail: "admin@example.org",
  localAuthName: "Admin",
  bootstrapAdminEmail: undefined,
  bootstrapAdminName: "Platform Owner",
  bootstrapAdminPassword: undefined,
  smtpHost: undefined,
  smtpPort: 587,
  smtpSecure: false,
  smtpStartTls: true,
  smtpUser: undefined,
  smtpPassword: undefined,
  smtpFrom: undefined,
  smtpReplyTo: undefined,
  notificationEmailCooldownMinutes: 720,
  storageProvider: "s3",
  storageAllowLocalInProduction: false,
  storageLocalRoot: undefined,
  storageSignedUrlTtlSeconds: 900,
  storageS3Bucket: "textpoint-files",
  storageS3Region: "us-east-1",
  storageS3Endpoint: undefined,
  storageS3AccessKeyId: undefined,
  storageS3SecretAccessKey: undefined,
  storageS3ForcePathStyle: false,
  storageS3Prefix: "textpoint",
  isProduction: true,
};

describe("environment readiness", () => {
  it("accepts a production-safe environment", () => {
    const result = evaluateEnvironmentReadiness(baseEnv);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("healthy");
    expect(result.issues).toHaveLength(0);
  });

  it("blocks local auth bypass in production", () => {
    const result = evaluateEnvironmentReadiness({
      ...baseEnv,
      localAuthBypass: true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.key === "local-auth-bypass")).toBe(true);
  });

  it("blocks local app urls in production", () => {
    const result = evaluateEnvironmentReadiness({
      ...baseEnv,
      appBaseUrl: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.key === "app-base-url-invalid")).toBe(true);
  });

  it("warns when bootstrap admin password is still present", () => {
    const result = evaluateEnvironmentReadiness({
      ...baseEnv,
      bootstrapAdminPassword: "keep-me-out-of-prod",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("attention");
    expect(
      result.issues.some((issue) => issue.key === "bootstrap-admin-password-set")
    ).toBe(true);
  });

  it("blocks incomplete s3 credentials", () => {
    const result = evaluateEnvironmentReadiness({
      ...baseEnv,
      storageS3AccessKeyId: "key-only",
      storageS3SecretAccessKey: undefined,
    });

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.key === "storage-s3-credentials-incomplete")
    ).toBe(true);
  });
});
