const iconCache = new Map<string, string>();

/**
 * Resolve icons for multiple tokens in a single request.
 * Returns a map of tokenId -> icon path.
 */
export const resolveIcons = async (
  tokenIds: string[]
): Promise<Record<string, string>> => {
  // Split into cached and uncached
  const result: Record<string, string> = {};
  const uncached: string[] = [];

  for (const id of tokenIds) {
    if (iconCache.has(id)) {
      result[id] = iconCache.get(id)!;
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return result;

  // Single batch request for all uncached icons
  try {
    const res = await fetch("/api/icon/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenIds: uncached }),
    });
    if (res.ok) {
      const data: Record<string, string> = await res.json();
      for (const [id, path] of Object.entries(data)) {
        iconCache.set(id, path);
        result[id] = path;
      }
    }
  } catch {}

  return result;
};

/**
 * Get a single icon (uses cache, falls back to batch endpoint).
 */
export const getCachedIcon = async (
  tokenId: string
): Promise<string | null> => {
  if (iconCache.has(tokenId)) return iconCache.get(tokenId)!;
  const result = await resolveIcons([tokenId]);
  return result[tokenId] || null;
};

export const checkLocalIcon = getCachedIcon;
export const getIconUrlFromServer = getCachedIcon;
