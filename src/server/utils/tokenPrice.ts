const ERG_DECIMALS = 9;

// Token USD Price Info
export const getTokenPriceInfo = async (tokenId: string | null) => {
  return {
    tokenId: tokenId,
    tokenPrice: 1.4,
    tokenDecimals: 9,
  };
};
