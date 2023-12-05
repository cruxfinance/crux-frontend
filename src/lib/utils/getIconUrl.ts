import axios from 'axios';

const baseIconUrl = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/';
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