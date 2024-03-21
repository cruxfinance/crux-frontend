import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";

export const getIcon = async (id: string) => {
  // Check for the icon locally first
  let url = await checkLocalIcon(id);
  // Otherwise, check the server for it
  if (!url) {
    url = await getIconUrlFromServer(id);
  }
  return url;
};

export const ERG_TOKEN_ID_MAP =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const allowedTokens: AllowedToken[] = [
  {
    id: "0000000000000000000000000000000000000000000000000000000000000000",
    name: "erg",
    icon: null,
    decimals: 9,
  },
  {
    id: "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365",
    name: "CRUX",
    icon: null,
    decimals: 4,
  },
  {
    id: "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04",
    name: "SigUSD",
    icon: null,
    decimals: 2,
  },
];