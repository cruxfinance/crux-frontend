export const getExchangeRate = async (): Promise<number | undefined> => {
  try {
    const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });

    const data = await response.json();
    if (data.price) return data.price
    else throw new Error("Unable to fetch Ergo price data")
  } catch (error) {
    console.error("Error fetching Ergo price data:", error);
  }
}