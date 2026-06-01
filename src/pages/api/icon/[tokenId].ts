import type { NextApiRequest, NextApiResponse } from "next";
import iconManifest from "../../../lib/utils/icon-manifest.json";

const baseIconUrl =
  "https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/";

const iconPathCache = new Map<string, string>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tokenId } = req.query;

  if (typeof tokenId !== "string") {
    res.status(400).send("Token ID must be a string.");
    return;
  }

  if (iconPathCache.has(tokenId)) {
    res.status(200).json({ iconPath: iconPathCache.get(tokenId) });
    return;
  }

  const extension = iconManifest[tokenId as keyof typeof iconManifest];
  let iconPath: string;
  if (extension) {
    iconPath = `/icons/tokens/${tokenId}.${extension}`;
  } else {
    iconPath = `${baseIconUrl}${tokenId}.svg`;
  }

  iconPathCache.set(tokenId, iconPath);
  res.status(200).json({ iconPath });
}