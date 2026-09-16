import { getServerAuthSession } from "@pages/api/auth/[...nextauth]";
import { slugify } from "@lib/utils/general";
import { prisma } from "@server/prisma";
import { getObject } from "@server/storage/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { pipeline } from "stream";

export const config = {
  api: {
    responseLimit: false,
  },
};

const KEY_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

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

  const session = await getServerAuthSession(req, res);
  if (!session?.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { key } = req.query;

  if (
    typeof key !== "string" ||
    !KEY_PATTERN.test(key) ||
    key.includes("..")
  ) {
    res.status(400).json({ message: "Invalid file key" });
    return;
  }

  const report = await prisma.report.findFirst({
    where: {
      reportFilename: key,
      userId: session.user.id,
    },
  });

  if (!report) {
    res.status(404).json({ message: "File not found" });
    return;
  }

  let object;
  try {
    object = await getObject("reports", key);
  } catch (e: any) {
    console.error(
      "Error fetching report file from storage:",
      e?.message ?? e
    );
    res.status(502).json({ message: "Error fetching file" });
    return;
  }

  if (!object) {
    res.status(404).json({ message: "File not found" });
    return;
  }

  const extMatch = key.match(/\.[^.]+$/);
  const extension = extMatch ? extMatch[0] : "";
  const slugName = report.customName ? slugify(report.customName) : "";
  const safeName = slugName ? `${slugName}${extension}` : key;

  const contentType = key.toLowerCase().endsWith(".zip")
    ? "application/zip"
    : "application/octet-stream";

  setSecurityHeaders(res);
  res.setHeader("Content-Type", contentType);
  if (typeof object.contentLength === "number") {
    res.setHeader("Content-Length", object.contentLength);
  }
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"`
  );
  res.setHeader("Cache-Control", "private, no-store");

  res.status(200);
  pipeline(object.body, res, (err) => {
    if (err && (err as NodeJS.ErrnoException).code !== "ERR_STREAM_PREMATURE_CLOSE") {
      console.error("Error streaming report file:", err.message);
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
