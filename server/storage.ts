import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

const DEFAULT_LOCAL_STORAGE_ROOT = path.resolve(import.meta.dirname, "..", "uploads");
const LOCAL_STORAGE_ROOT = ENV.storageLocalRoot
  ? path.resolve(ENV.storageLocalRoot)
  : DEFAULT_LOCAL_STORAGE_ROOT;
const STORAGE_ROUTE_PREFIX = "/storage";

let s3Client: S3Client | null = null;

export function assertStorageConfiguration() {
  if (ENV.storageProvider === "s3") {
    if (!ENV.storageS3Bucket?.trim()) {
      throw new Error(
        "STORAGE_PROVIDER is set to s3 but STORAGE_S3_BUCKET is missing. Configure S3-compatible object storage before starting the app."
      );
    }

    const hasAccessKey = Boolean(ENV.storageS3AccessKeyId?.trim());
    const hasSecretKey = Boolean(ENV.storageS3SecretAccessKey?.trim());
    if (hasAccessKey !== hasSecretKey) {
      throw new Error(
        "S3 storage credentials are incomplete. Set both STORAGE_S3_ACCESS_KEY_ID and STORAGE_S3_SECRET_ACCESS_KEY, or leave both unset when your runtime provides credentials automatically."
      );
    }

    return;
  }

  if (ENV.isProduction && !ENV.storageAllowLocalInProduction) {
    throw new Error(
      "Production storage is still set to local. Configure STORAGE_PROVIDER=s3 for durable uploads, or set STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true only if you intentionally accept non-durable local file storage."
    );
  }
}

function normalizeKey(relKey: string): string {
  return relKey
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .trim();
}

function ensureSafeStorageKey(relKey: string): string {
  const normalized = normalizeKey(relKey);
  if (!normalized || normalized.startsWith("..") || normalized.includes("/../")) {
    throw new Error("Invalid storage key.");
  }
  return normalized;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const segmentStart = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");

  if (lastDot === -1 || lastDot <= segmentStart) {
    return `${relKey}_${hash}`;
  }

  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function appendStoragePrefix(key: string): string {
  const prefix = ENV.storageS3Prefix
    ?.trim()
    .replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${key}` : key;
}

function publicUrlFor(key: string): string {
  return `${STORAGE_ROUTE_PREFIX}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function ensureLocalPathForKey(key: string): string {
  const filePath = path.resolve(LOCAL_STORAGE_ROOT, key);
  const relative = path.relative(LOCAL_STORAGE_ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Storage path escapes the configured root.");
  }
  return filePath;
}

function getS3Client(): S3Client {
  if (!ENV.storageS3Bucket) {
    throw new Error("Missing required environment variable: STORAGE_S3_BUCKET");
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: ENV.storageS3Region,
      endpoint: ENV.storageS3Endpoint,
      forcePathStyle: ENV.storageS3ForcePathStyle,
      credentials:
        ENV.storageS3AccessKeyId && ENV.storageS3SecretAccessKey
          ? {
              accessKeyId: ENV.storageS3AccessKeyId,
              secretAccessKey: ENV.storageS3SecretAccessKey,
            }
          : undefined,
    });
  }
  return s3Client;
}

export async function ensureStorageReady() {
  assertStorageConfiguration();
  if (ENV.storageProvider === "local") {
    await fs.mkdir(LOCAL_STORAGE_ROOT, { recursive: true });
  }
}

export function getStorageRuntimeSummary() {
  if (ENV.storageProvider === "s3") {
    return {
      provider: "s3" as const,
      bucket: ENV.storageS3Bucket ?? null,
      prefix: ENV.storageS3Prefix?.trim() || null,
      signedUrlTtlSeconds: ENV.storageSignedUrlTtlSeconds,
    };
  }

  return {
    provider: "local" as const,
    root: LOCAL_STORAGE_ROOT,
    productionOverride: ENV.isProduction && ENV.storageAllowLocalInProduction,
  };
}

export function getLegacyLocalStorageRoot() {
  return DEFAULT_LOCAL_STORAGE_ROOT;
}

export function storageResolveUrl(relKey: string): string {
  const key = ensureSafeStorageKey(relKey);
  return publicUrlFor(key);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const normalized = ensureSafeStorageKey(relKey);
  const key = appendHashSuffix(normalized);

  if (ENV.storageProvider === "s3") {
    const bucketKey = appendStoragePrefix(key);
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: ENV.storageS3Bucket,
        Key: bucketKey,
        Body: data,
        ContentType: contentType,
      })
    );
  } else {
    const filePath = ensureLocalPathForKey(key);
    await ensureDir(filePath);
    await fs.writeFile(filePath, data);
  }

  return {
    key,
    url: publicUrlFor(key),
  };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = ensureSafeStorageKey(relKey);

  if (ENV.storageProvider === "s3") {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: ENV.storageS3Bucket,
        Key: appendStoragePrefix(key),
      })
    );
  } else {
    await fs.access(ensureLocalPathForKey(key));
  }

  return {
    key,
    url: publicUrlFor(key),
  };
}

export async function serveStorageObject(req: Request, res: Response) {
  const wildcard = req.params[0];
  const requestedKey = Array.isArray(wildcard) ? wildcard.join("/") : String(wildcard ?? "");
  const key = ensureSafeStorageKey(decodeURIComponent(requestedKey));

  if (ENV.storageProvider === "s3") {
    const signedUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: ENV.storageS3Bucket,
        Key: appendStoragePrefix(key),
      }),
      { expiresIn: ENV.storageSignedUrlTtlSeconds }
    );
    res.redirect(302, signedUrl);
    return;
  }

  res.sendFile(ensureLocalPathForKey(key));
}
