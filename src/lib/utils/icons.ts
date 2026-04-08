import iconManifest from "./icon-manifest.json";

const iconCache = new Map<string, string>();

const baseIconUrl =
  "https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/";

function getLocalIconPath(tokenId: string): string | null {
  const extension = iconManifest[tokenId as keyof typeof iconManifest];
  if (extension) {
    return `/icons/tokens/${tokenId}.${extension}`;
  }
  return null;
}

export const checkLocalIcon = (tokenId: string): string | null => {
  if (iconCache.has(tokenId)) return iconCache.get(tokenId)!;

  const localPath = getLocalIconPath(tokenId);
  if (localPath) {
    iconCache.set(tokenId, localPath);
    return localPath;
  }

  return null;
};

export const getIconUrlFromServer = (tokenId: string): string | null => {
  if (iconCache.has(tokenId)) return iconCache.get(tokenId)!;

  const localPath = getLocalIconPath(tokenId);
  if (localPath) {
    iconCache.set(tokenId, localPath);
    return localPath;
  }

  const externalUrl = `${baseIconUrl}${tokenId}.svg`;
  iconCache.set(tokenId, externalUrl);
  return externalUrl;
};

export const resolveIcons = (
  tokenIds: string[]
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const id of tokenIds) {
    if (iconCache.has(id)) {
      result[id] = iconCache.get(id)!;
      continue;
    }

    const localPath = getLocalIconPath(id);
    if (localPath) {
      iconCache.set(id, localPath);
      result[id] = localPath;
      continue;
    }

    const externalUrl = `${baseIconUrl}${id}.svg`;
    iconCache.set(id, externalUrl);
    result[id] = externalUrl;
  }

  return result;
};

export const getCachedIcon = (tokenId: string): string | null => {
  if (iconCache.has(tokenId)) return iconCache.get(tokenId)!;

  const localPath = getLocalIconPath(tokenId);
  if (localPath) {
    iconCache.set(tokenId, localPath);
    return localPath;
  }

  const externalUrl = `${baseIconUrl}${tokenId}.svg`;
  iconCache.set(tokenId, externalUrl);
  return externalUrl;
};