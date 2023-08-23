import { ITrade } from '@src/components/tokenInfo/TradeHistory';
import { NextApiRequest, NextApiResponse } from 'next';

// Sample exchange rates
const exchangeRates = {
  USD: 1,
  ERG: 0.83,
  // ... add other currencies as needed
};

function generateRandomErgoAddress(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '9';
  for (let i = 0; i < length - 1; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

function generateRandomTransaction(previousTimestamp: Date): any {
  const types = ['Buy', 'Sell', 'Add', 'Remove'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  // Generate a random duration between 1 minute and 1 hour
  const randomDuration = Math.floor(Math.random() * 60) + 1; // in minutes
  const newTimestamp = new Date(previousTimestamp.getTime() - randomDuration * 60 * 1000); // subtracting the duration

  // Ensure Add and Remove are rare
  if (randomType === 'Add' || randomType === 'Remove') {
    if (Math.random() > 0.95) {
      return {
        timestamp: newTimestamp,
        type: randomType,
        totalToken: Math.floor(Math.random() * 1000000) + 1, // Between 1 and 1M
        wallet: generateRandomErgoAddress(64)
      };
    } else {
      return generateRandomTransaction(previousTimestamp); // Retry to get another type
    }
  } else {
    return {
      timestamp: newTimestamp,
      type: randomType,
      price: +(Math.random() * 0.1).toFixed(3),
      totalToken: Math.floor(Math.random() * 1000000) + 1, // Between 1 and 1M
      totalExchange: Math.floor(Math.random() * 1000000) + 1, // Between 1 and 1M
      wallet: generateRandomErgoAddress(64)
    };
  }
}

let currentTimestamp = new Date();

const tradeHistory = Array.from({ length: 10000 }, () => {
  const transaction = generateRandomTransaction(currentTimestamp);
  currentTimestamp = transaction.timestamp;
  return transaction;
});

let cachedTradeHistory: ITrade[] = tradeHistory; // This will store our cached trade history

export default (req: NextApiRequest, res: NextApiResponse) => {
  const limit = parseInt(req.query.limit as string) || 25;
  const offset = parseInt(req.query.offset as string) || 0;
  const tokenId = req.query.tokenId as string;
  const currency = (req.query.currency as string) || 'USD';
  const tradingPair = req.query.tradingPair as string | undefined;

  // Convert prices based on the provided currency
  const rate = exchangeRates[currency as keyof typeof exchangeRates];
  if (!rate) {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  const convertedHistory = cachedTradeHistory.map(trade => ({
    ...trade,
    // price: trade.price ? trade.price * rate : undefined,
    // totalExchange: trade.totalExchange ? trade.totalExchange * rate : undefined,
  }));

  // Apply limit and offset
  const result = convertedHistory.slice(offset, offset + limit);

  res.json(result);
};