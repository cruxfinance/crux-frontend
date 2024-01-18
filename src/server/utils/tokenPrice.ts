import { cruxApi } from "@server/services/axiosInstance";

const ERG_DECIMALS = 9;

// Token USD Price Info
export const getTokenPriceInfo = async (tokenId: string | null) => {
  try {
    const ergPrice = (await cruxApi.get("/coingecko/erg_price")).data.price;
    if (tokenId === null) {
      return {
        tokenId: tokenId,
        tokenPrice: ergPrice,
        tokenDecimals: ERG_DECIMALS,
      };
    }
    const tokenInfo = (await cruxApi.get(`/crux/token_info/${tokenId}`)).data;
    const tokenPrice = tokenInfo.value_in_erg * ergPrice;
    const tokenDecimals = tokenInfo.decimals;
    return {
      tokenId: tokenId,
      tokenPrice: tokenPrice,
      tokenDecimals: tokenDecimals,
    };
  } catch (e: any) {
    console.log(e);
    throw new Error(
      "Token price API in facing availability issues. Try again later."
    );
  }
};
