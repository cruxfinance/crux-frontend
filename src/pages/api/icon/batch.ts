import type { NextApiRequest, NextApiResponse } from "next";
import iconManifest from "../../../lib/utils/icon-manifest.json";

const baseIconUrl =
  "https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/";

const iconPathCache = new Map<string, string>();

function getIconPath(tokenId: string): string {
  if (iconPathCache.has(tokenId)) return iconPathCache.get(tokenId)!;

  const extension = iconManifest[tokenId as keyof typeof iconManifest];
  if (extension) {
    const localPath = `/icons/tokens/${tokenId}.${extension}`;
    iconPathCache.set(tokenId, localPath);
    return localPath;
  }

  const externalUrl = `${baseIconUrl}${tokenId}.svg`;
  iconPathCache.set(tokenId, externalUrl);
  return externalUrl;
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
      result[id] = getIconPath(id);
    }
  }

  res.status(200).json(result);
}