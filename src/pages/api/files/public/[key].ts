import { getObject } from "@server/storage/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { pipeline } from "stream";

export const config = {
  api: {
    responseLimit: false,
  },
};

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}\.(jpe?g|png)$/;

const extensionContentType = (key: string): string => {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
};

const setSecurityHeaders = (res: NextApiResponse) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { key } = req.query;

  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    res.status(400).json({ message: "Invalid file key" });
    return;
  }

  let object;
  try {
    object = await getObject("public", key);
  } catch (e: any) {
    console.error("Error fetching public file from storage:", e?.message ?? e);
    res.status(502).json({ message: "Error fetching file" });
    return;
  }

  if (!object) {
    res.status(404).json({ message: "File not found" });
    return;
  }

  const etag = object.etag;

  setSecurityHeaders(res);
  if (etag) {
    res.setHeader("ETag", etag);
  }
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  if (etag && req.headers["if-none-match"] === etag) {
    object.body.destroy();
    res.status(304).end();
    return;
  }

  res.setHeader("Content-Type", extensionContentType(key));
  if (typeof object.contentLength === "number") {
    res.setHeader("Content-Length", object.contentLength);
  }

  res.status(200);
  pipeline(object.body, res, (err) => {
    if (err && (err as NodeJS.ErrnoException).code !== "ERR_STREAM_PREMATURE_CLOSE") {
      console.error("Error streaming public file:", err.message);
    }
    if (err && !res.headersSent) {
      res.removeHeader("Content-Length");
      res.removeHeader("ETag");
      res.removeHeader("Content-Disposition");
      res.setHeader("Cache-Control", "no-store");
      res.status(502).end();
    }
  });
}
