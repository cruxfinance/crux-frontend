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
  const localIconPath = `/icons/tokens/${tokenId}.svg`;
  try {
    const response = await fetch(localIconPath, { method: 'HEAD' });
    return response.ok ? localIconPath : null; // if the head request is ok, the file exists
  } catch (error) {
    return null;
  }
};