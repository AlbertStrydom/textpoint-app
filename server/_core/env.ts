import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Check your .env file or deployment configuration.`
    );
  }
  return value;
}

function optional(key: string): string | undefined {
  return process.env[key] || undefined;
}

function numberFromEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value == null || value === "") return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function booleanFromEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value == null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function oneOfFromEnv<const T extends readonly string[]>(
  key: string,
  allowedValues: T,
  defaultValue: T[number]
): T[number] {
  const value = process.env[key];
  if (!value) return defaultValue;
  return allowedValues.includes(value as T[number]) ? (value as T[number]) : defaultValue;
}

export const ENV = {
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  appBaseUrl: required("APP_BASE_URL"),
  databaseUrl: required("DATABASE_URL"),
  forgeApiUrl: optional("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: optional("BUILT_IN_FORGE_API_KEY"),
  localAuthBypass: booleanFromEnv("LOCAL_AUTH_BYPASS", false),
  localAuthEmail: optional("LOCAL_AUTH_EMAIL") ?? "admin@company.com",
  localAuthName: optional("LOCAL_AUTH_NAME") ?? "Admin",
  bootstrapAdminEmail: optional("BOOTSTRAP_ADMIN_EMAIL"),
  bootstrapAdminName: optional("BOOTSTRAP_ADMIN_NAME") ?? "Platform Owner",
  bootstrapAdminPassword: optional("BOOTSTRAP_ADMIN_PASSWORD"),
  smtpHost: optional("SMTP_HOST"),
  smtpPort: numberFromEnv("SMTP_PORT", 587),
  smtpSecure: booleanFromEnv("SMTP_SECURE", false),
  smtpStartTls: booleanFromEnv("SMTP_STARTTLS", true),
  smtpUser: optional("SMTP_USER"),
  smtpPassword: optional("SMTP_PASSWORD"),
  smtpFrom: optional("SMTP_FROM"),
  smtpReplyTo: optional("SMTP_REPLY_TO"),
  notificationEmailCooldownMinutes: numberFromEnv(
    "NOTIFICATION_EMAIL_COOLDOWN_MINUTES",
    720
  ),
  reminderSchedulerEnabled: booleanFromEnv(
    "REMINDER_SCHEDULER_ENABLED",
    process.env.NODE_ENV === "production"
  ),
  reminderSchedulerIntervalMinutes: numberFromEnv("REMINDER_SCHEDULER_INTERVAL_MINUTES", 360),
  reminderSchedulerRunOnBoot: booleanFromEnv("REMINDER_SCHEDULER_RUN_ON_BOOT", false),
  storageProvider: oneOfFromEnv("STORAGE_PROVIDER", ["local", "s3"] as const, "local"),
  storageAllowLocalInProduction: booleanFromEnv("STORAGE_ALLOW_LOCAL_IN_PRODUCTION", false),
  storageLocalRoot: optional("STORAGE_LOCAL_ROOT"),
  storageSignedUrlTtlSeconds: numberFromEnv("STORAGE_SIGNED_URL_TTL_SECONDS", 900),
  storageS3Bucket: optional("STORAGE_S3_BUCKET"),
  storageS3Region: optional("STORAGE_S3_REGION") ?? "us-east-1",
  storageS3Endpoint: optional("STORAGE_S3_ENDPOINT"),
  storageS3AccessKeyId: optional("STORAGE_S3_ACCESS_KEY_ID"),
  storageS3SecretAccessKey: optional("STORAGE_S3_SECRET_ACCESS_KEY"),
  storageS3ForcePathStyle: booleanFromEnv("STORAGE_S3_FORCE_PATH_STYLE", false),
  storageS3Prefix: optional("STORAGE_S3_PREFIX"),
  isProduction: process.env.NODE_ENV === "production",
};

export type Env = typeof ENV;

export type EnvironmentReadinessSeverity = "error" | "warning" | "info";

export type EnvironmentReadinessIssue = {
  key: string;
  severity: EnvironmentReadinessSeverity;
  message: string;
};

function looksLikePlaceholder(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("replace-with") ||
    normalized.includes("change-this") ||
    normalized.includes("your-app-name") ||
    normalized.includes("example.com")
  );
}

function isLocalUrl(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("0.0.0.0")
  );
}

export function evaluateEnvironmentReadiness(env: Env = ENV) {
  const issues: EnvironmentReadinessIssue[] = [];

  if (env.localAuthBypass) {
    issues.push({
      key: "local-auth-bypass",
      severity: env.isProduction ? "error" : "warning",
      message:
        "LOCAL_AUTH_BYPASS is enabled. Disable it before production sign-off.",
    });
  }

  if (looksLikePlaceholder(env.betterAuthSecret)) {
    issues.push({
      key: "better-auth-secret-placeholder",
      severity: "error",
      message: "BETTER_AUTH_SECRET still looks like a placeholder value.",
    });
  }

  if (env.isProduction && (isLocalUrl(env.appBaseUrl) || looksLikePlaceholder(env.appBaseUrl))) {
    issues.push({
      key: "app-base-url-invalid",
      severity: env.storageAllowLocalInProduction ? "warning" : "error",
      message:
        "APP_BASE_URL is not production-safe. Use the real public HTTPS URL for the deployed app.",
    });
  }

  if (env.isProduction && env.bootstrapAdminPassword?.trim()) {
    issues.push({
      key: "bootstrap-admin-password-set",
      severity: "warning",
      message:
        "BOOTSTRAP_ADMIN_PASSWORD is still configured. Remove it after the first successful live admin login.",
    });
  }

  if (env.storageProvider === "local") {
    issues.push({
      key: "local-storage-provider",
      severity:
        env.isProduction && !env.storageAllowLocalInProduction ? "error" : "warning",
      message:
        env.isProduction && !env.storageAllowLocalInProduction
          ? "Storage is still configured for local disk in production."
          : "Uploads are using local disk storage. This is acceptable for local testing, not ideal for rollout.",
    });
  }

  if (env.storageProvider === "s3" && !env.storageS3Bucket?.trim()) {
    issues.push({
      key: "storage-s3-bucket-missing",
      severity: "error",
      message: "STORAGE_PROVIDER is s3 but STORAGE_S3_BUCKET is missing.",
    });
  }

  const hasAccessKey = Boolean(env.storageS3AccessKeyId?.trim());
  const hasSecretKey = Boolean(env.storageS3SecretAccessKey?.trim());
  if (hasAccessKey !== hasSecretKey) {
    issues.push({
      key: "storage-s3-credentials-incomplete",
      severity: "error",
      message:
        "S3 storage credentials are incomplete. Set both STORAGE_S3_ACCESS_KEY_ID and STORAGE_S3_SECRET_ACCESS_KEY, or neither.",
    });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    ok: errorCount === 0,
    status:
      errorCount > 0 ? "error" : warningCount > 0 ? "attention" : "healthy",
    issues,
  } as const;
}
