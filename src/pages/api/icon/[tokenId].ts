import axios from 'axios';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

const baseIconUrl = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/09655f0b3328762b22fdb3266952f74a3e30be36/logos/ergo/';
const localIconDirectory = './public/icons/tokens'; // Adjust this path as needed
// const placeholderSVGContent = `<svg fill="#999999" width="800px" height="800px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
// <title>cancel</title>
// <path d="M16 29c-7.18 0-13-5.82-13-13s5.82-13 13-13 13 5.82 13 13-5.82 13-13 13zM21.961 12.209c0.244-0.244 0.244-0.641 0-0.885l-1.328-1.327c-0.244-0.244-0.641-0.244-0.885 0l-3.761 3.761-3.761-3.761c-0.244-0.244-0.641-0.244-0.885 0l-1.328 1.327c-0.244 0.244-0.244 0.641 0 0.885l3.762 3.762-3.762 3.76c-0.244 0.244-0.244 0.641 0 0.885l1.328 1.328c0.244 0.244 0.641 0.244 0.885 0l3.761-3.762 3.761 3.762c0.244 0.244 0.641 0.244 0.885 0l1.328-1.328c0.244-0.244 0.244-0.641 0-0.885l-3.762-3.76 3.762-3.762z"></path>
// </svg>`; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tokenId } = req.query;

  if (typeof tokenId !== 'string') {
    res.status(400).send('Token ID must be a string.');
    return;
  }

  // Define the local and external paths for the icon
  const localFilePath = path.join(localIconDirectory, `${tokenId}.svg`);
  const externalIconUrl = `${baseIconUrl}${tokenId}.svg`;

  try {
    // Try to get the external icon
    const response = await axios.get(externalIconUrl, { responseType: 'arraybuffer' });
    // If successful, write the icon to the local file system
    fs.writeFileSync(localFilePath, response.data);
    // And then respond with the local path to the saved icon
    res.status(200).json({ iconPath: `/icons/tokens/${tokenId}.svg` });
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
      // If there's a 404 response for the external icon, write a placeholder SVG locally
      // fs.writeFileSync(localFilePath, placeholderSVGContent, 'utf8');
      // Respond with the local path to the placeholder icon
      res.status(200).json({ iconPath: `/icons/tokens/placeholder.svg` });
    } else {
      // If there's an error other than a 404, respond accordingly
      console.error('Error fetching token icon:', error.message);
      res.status(500).json({ message: 'An error occurred while fetching the icon.' });
    }
  }
}
