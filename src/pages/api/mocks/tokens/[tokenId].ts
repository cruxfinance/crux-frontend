// import { tokenData } from '@pages/api/mocks/data/tokenInfo';
// import { NextApiRequest, NextApiResponse } from 'next';

// // Hard-coded exchange rates for testing
// const exchangeRates = {
//   USD: 1,
//   ERG: 0.83
// };

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   const tokenId = req.query.tokenId
//   const currency = req.query.currency

//   if (typeof tokenId !== 'string') {
//     return res.status(400).json({ error: 'Invalid token ID' });
//   }

//   if (currency && (!exchangeRates[currency as keyof typeof exchangeRates] || typeof currency !== 'string')) {
//     return res.status(400).json({ error: 'Invalid currency' });
//   }

//   // Find the token by its tokenId
//   const token = tokenData.find(t => t.tokenId === tokenId);

//   if (!token) {
//     return res.status(404).json({ error: 'Token not found' });
//   }

//   const rate = exchangeRates[currency as keyof typeof exchangeRates];
//   const newToken = {
//     ...token,
//     price: token.price * rate
//   }

//   return res.status(200).json(newToken);
// }