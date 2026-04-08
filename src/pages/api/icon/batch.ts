import fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

const localIconDirectory = "./public/icons/tokens";
const extensions = ["svg", "png", "webp", "jpg"];

// Server-side cache persists across requests
const iconPathCache = new Map<string, string>();

function findLocalIcon(tokenId: string): string {
  if (iconPathCache.has(tokenId)) return iconPathCache.get(tokenId)!;

  for (const ext of extensions) {
    const filePath = path.join(localIconDirectory, `${tokenId}.${ext}`);
    if (fs.existsSync(filePath)) {
      const iconPath = `/icons/tokens/${tokenId}.${ext}`;
      iconPathCache.set(tokenId, iconPath);
      return iconPath;
    }
  }

  const placeholder = `/icons/tokens/placeholder.svg`;
  iconPathCache.set(tokenId, placeholder);
  return placeholder;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST required" });
    return;
  }

  const { tokenIds } = req.body;
  if (!Array.isArray(tokenIds)) {
    res.status(400).json({ error: "tokenIds must be an array" });
    return;
  }

  const result: Record<string, string> = {};
  for (const id of tokenIds) {
    if (typeof id === "string") {
      result[id] = findLocalIcon(id);
    }
  }

  res.status(200).json(result);
}
