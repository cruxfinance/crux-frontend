import axios from 'axios';

const baseIconUrl = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/7168b3373a60a4f46b8995d86fb1efce93476aba/logos/ergo/';
const possibleExtensions = ['svg']; // Add more if needed

export const getIconUrl = async (tokenId: string): Promise<string | null> => {
  for (const ext of possibleExtensions) {
    const url = `${baseIconUrl}${tokenId}.${ext}`;
    try {
      const response = await axios.head(url); // Make a HEAD request to check if the resource exists
      if (response.status === 200) {
        return url; // If the resource exists, return the URL
      }
    } catch (error) {
      // console.error(`Resource not found: ${url}`);
    }
  }
  return null; // If none of the URLs exist, return null
}