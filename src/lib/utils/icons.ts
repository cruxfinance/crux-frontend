export const getIconUrlFromServer = async (tokenId: string) => {
  try {
    const response = await fetch(`/api/icon/${tokenId}`);
    if (!response.ok) {
      throw new Error('Server responded with an error.');
    }
    // Expecting the response to contain the path
    const data = await response.json();
    return data.iconPath;
  } catch (error) {
    console.error('Failed to fetch icon from server:', error);
    return null;
  }
};

export const checkLocalIcon = async (tokenId: string) => {
  const extensions = ['svg', 'jpg', 'png'];
  for (const ext of extensions) {
    const localIconPath = `/icons/tokens/${tokenId}.${ext}`;
    try {
      const response = await fetch(localIconPath, { method: 'HEAD' });
      if (response.ok) {
        return localIconPath;
      }
    } catch (error) {
      // Ignore and try next extension
    }
  }
  return null;
};