import { cruxApi } from "@server/services/axiosInstance";
import { ERG_DECIMALS } from "@lib/configs/paymentTokens";

// Token USD Price Info
export const getTokenPriceInfo = async (tokenId: string | null) => {
  try {
    const adjustedTokenId = tokenId ?? "0000000000000000000000000000000000000000000000000000000000000000";
    const tokenDetails = (await cruxApi.get(`spectrum/price_stats?token_id=${adjustedTokenId}&time_point=${Date.now()}&time_window=86400`)).data;
    return {
      tokenId: tokenId,
      tokenPrice: (tokenDetails?.average?.usd as number),
      tokenDecimals: (tokenDetails?.token_info?.decimals as number),
    };
  } catch (e: any) {
    throw new Error(
      "Token price API in facing availability issues. Try again later."
    );
  }
};
