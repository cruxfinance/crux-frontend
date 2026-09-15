import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY ?? "";
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY ?? "";
const AMAZON_REGION_ENV = process.env.AMAZON_REGION;
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || undefined;
const PUBLIC_BUCKET = process.env.CRUX_PUBLIC_BUCKET ?? "";
const REPORTS_BUCKET = process.env.CRUX_REPORTS_BUCKET ?? "";

// When STORAGE_ENDPOINT is set (e.g. pointing at Cloudflare R2), default the
// region to "auto" unless AMAZON_REGION was explicitly provided.
const region = STORAGE_ENDPOINT
  ? (AMAZON_REGION_ENV ?? "auto")
  : (AMAZON_REGION_ENV ?? "eu-central-1");

const client = new S3Client({
  region,
  credentials: {
    accessKeyId: AMAZON_ACCESS_KEY,
    secretAccessKey: AMAZON_SECRET_KEY,
  },
  ...(STORAGE_ENDPOINT
    ? { endpoint: STORAGE_ENDPOINT, forcePathStyle: true }
    : {}),
});

export interface StoredObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

const bucketFor = (bucket: "public" | "reports"): string =>
  bucket === "public" ? PUBLIC_BUCKET : REPORTS_BUCKET;

const isNotFoundError = (err: any): boolean => {
  if (!err) return false;
  const name = err.name ?? err.Code;
  if (name === "NoSuchKey" || name === "NotFound") return true;
  return err.$metadata?.httpStatusCode === 404;
};

export const putPublicObject = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> => {
  await client.send(
    new PutObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

export const getObject = async (
  bucket: "public" | "reports",
  key: string
): Promise<StoredObject | null> => {
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucketFor(bucket),
        Key: key,
      })
    );

    return {
      // The Node.js runtime returns a Readable stream for Body.
      body: result.Body as unknown as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
      lastModified: result.LastModified,
    };
  } catch (err: any) {
    if (isNotFoundError(err)) {
      return null;
    }
    throw err;
  }
};
