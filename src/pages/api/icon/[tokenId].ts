import axios from "axios";
import fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

const baseIconUrl =
  "https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/";
const localIconDirectory = "./public/icons/tokens";
const extensions = ["svg", "png", "webp", "jpg"];

// Server-side cache: tokenId -> icon path (survives across requests)
const iconPathCache = new Map<string, string>();

function findLocalIcon(tokenId: string): string | null {
  for (const ext of extensions) {
    const filePath = path.join(localIconDirectory, `${tokenId}.${ext}`);
    if (fs.existsSync(filePath)) {
      return `/icons/tokens/${tokenId}.${ext}`;
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tokenId } = req.query;

  if (typeof tokenId !== "string") {
    res.status(400).send("Token ID must be a string.");
    return;
  }

  // Check server-side cache first
  if (iconPathCache.has(tokenId)) {
    res.status(200).json({ iconPath: iconPathCache.get(tokenId) });
    return;
  }

  // Check local filesystem (instant, no network)
  const localIcon = findLocalIcon(tokenId);
  if (localIcon) {
    iconPathCache.set(tokenId, localIcon);
    res.status(200).json({ iconPath: localIcon });
    return;
  }

  // Fallback: fetch from GitHub and save locally
  const externalIconUrl = `${baseIconUrl}${tokenId}.svg`;
  try {
    const response = await axios.get(externalIconUrl, {
      responseType: "arraybuffer",
    });
    const localFilePath = path.join(localIconDirectory, `${tokenId}.svg`);
    fs.writeFileSync(localFilePath, response.data);
    const iconPath = `/icons/tokens/${tokenId}.svg`;
    iconPathCache.set(tokenId, iconPath);
    res.status(200).json({ iconPath });
  } catch (error: any) {
    const placeholder = `/icons/tokens/placeholder.svg`;
    iconPathCache.set(tokenId, placeholder);
    res.status(200).json({ iconPath: placeholder });
  }
}
