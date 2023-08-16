// Makes requests to API
export async function makeApiRequest(path: string) {
  try {
    const response = await fetch(`${process.env.API_URL}/${path}`);
    return response.json();
  } catch (error: any) {
    throw new Error(`API request error: ${error.status}`);
  }
}

// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange: string, fromSymbol: string, toSymbol: string) {
  const short = `${fromSymbol}/${toSymbol}`;
  return {
    short,
    full: `${exchange}:${short}`,
  };
}

// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol: string) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }
  return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}