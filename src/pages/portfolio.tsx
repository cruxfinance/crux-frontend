import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  // Divider,
  // CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
  TextField,
  Typography,
  Container
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
// import Balance from "@components/portfolio/Balance";
import { IPieToken } from "@components/charts/PieChart";
import TokenSummary from "@components/portfolio/TokenSummary";
// import NftList from "@components/portfolio/NftList";
import { tokenListInfo } from "../lib/utils/assetsNew";
// import ValueLocked from "@components/portfolio/ValueLocked";
import { adjustDecimals } from "../lib/utils/general";
import HistoricValues from "@components/portfolio/HistoricValues";
import StakedPositions from "@components/portfolio/positions/StakedPositions";
import LiquidityPositions from "@components/portfolio/positions/LiquidityPositions";
// import { useSession } from "next-auth/react";
import Positions from "@components/portfolio/positions/Positions";
import { WalletProvider, useWallet } from "@lib/contexts/WalletContext";
// import { useScrollLock } from "@contexts/ScrollLockContext";
import { currencies, Currencies } from '@lib/utils/currencies';
// import FungibleCollectablesList from "@components/portfolio/FungibleCollectablesList";
import Collectibles from "@components/portfolio/Collectibles";
import CurrencyButton from "@components/CurrencyButton";


export interface IExtendedToken extends IPieToken {
  tokenId: string;
  decimals: number;
  pctChange?: number; // expressed with 2 decimals. 100 = 1.00%
  tokenType?: string;
}

export interface IReducedToken extends IPieToken {
  tokenId: string;
  description?: string;
  pctChange?: number;
  wrappedTokenNames?: string[];
  wrappedTokenIds?: string[];
  wrappedTokenAmounts?: number[];
}

interface IPortfolioToken {
  token_amount: number;
  wrapped_tokens: IPortfolioToken[];
  token_id: string;
  token_name: string;
  token_description: string;
  decimals: number;
  minted: number;
  value_in_erg: number;
}

const Portfolio = () => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const { sessionStatus, sessionData } = useWallet()
  const [boxHeight, setBoxHeight] = useState("500px");
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    tokenSummary: true,
  });
  const [currency, setCurrency] = useState<Currencies>("ERG");
  const [filteredNfts, setFilteredNfts] = useState<INftItem[]>([]);
  const [filteredFts, setFilteredFts] = useState<INftItem[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [sortedFilteredTokensList, setSortedFilteredTokensList] = useState<
    IReducedToken[]
  >([]);
  // const [tokenList, setTokenList] = useState<IPortfolioToken[]>([])
  const [addressList, setAddressList] = useState<string>('');
  const [submittedAddressList, setSubmittedAddressList] = useState<string[]>([]);
  const [totalValueLocked, setTotalValueLocked] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    const getAddresses = localStorage.getItem("crux_portfolio_address_list");
    const parsedAddresses = getAddresses ? JSON.parse(getAddresses) : [];
    if (parsedAddresses && parsedAddresses.length > 0 && parsedAddresses[0] !== "") {
      getExchange();
      setAddressList(parsedAddresses);
      fetchData(parsedAddresses);
    }
    else if (
      sessionStatus === "authenticated" &&
      sessionData?.user?.address !== undefined
    ) {
      getExchange();
      setAddressList(sessionData.user.address);
      fetchData([sessionData.user.address]);
    }
  }, [])

  const getExchange = async () => {
    try {
      setLoading((prev) => {
        return {
          ...prev,
          fetchExchangeRate: true,
        };
      });
      const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-type": "application/json",
        },
      });

      const data = await response.json();
      setExchangeRate(data.price);
      setLoading((prev) => {
        return {
          ...prev,
          fetchExchangeRate: false,
        };
      });
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      setLoading((prev) => {
        return {
          ...prev,
          fetchExchangeRate: false,
        };
      });
    }
  };

  const fetchTokenData = async (
    thisAddressList: string[]
  ): Promise<IPortfolioToken[]> => {
    if (thisAddressList.length > 0) {
      try {
        setLoading((prev) => {
          return {
            ...prev,
            fetchPortfolio: true,
          };
        });
        const endpoint = `${process.env.CRUX_API}/crux/portfolio`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({ addresses: thisAddressList }),
        });

        const data: IPortfolioToken[] = await response.json();
        setLoading((prev) => {
          return {
            ...prev,
            fetchPortfolio: false,
          };
        });
        return data;
      } catch (error) {
        console.error("Error fetching token data:", error);
        setLoading((prev) => {
          return {
            ...prev,
            fetchPortfolio: false,
          };
        });
        return [];
      }
    } else return [];
  };

  const calculateWrappedTokensValue = (token: IPortfolioToken) => {
    let totalValue = 0;

    // if there are wrapped tokens, check each of them for value
    if (token.wrapped_tokens && token.wrapped_tokens.length) {
      token.wrapped_tokens.forEach((wrappedToken) => {
        totalValue += calculateWrappedTokensValue(wrappedToken);
      });
    }

    // If the totalValue from wrapped tokens is still 0, then consider the parent token's value
    if (totalValue === 0 && token.value_in_erg > 0) {
      totalValue +=
        adjustDecimals(token.token_amount, token.decimals) * token.value_in_erg;
    }

    return totalValue;
  };

  let fetchAcc = 1;

  const fetchData = async (thisAddressList: string[]) => {
    setSubmittedAddressList(thisAddressList)
    const data = await fetchTokenData(thisAddressList);

    // remove NFTs & tokens with no dex value
    const mainList = data.filter(
      (item) => calculateWrappedTokensValue(item) > 0
    );

    const collectablesList = data.filter(
      (item) => calculateWrappedTokensValue(item) === 0
    );

    // This is meant to adjust token amounts with correct decimals
    // It also gathers the over-all value of any tokens which contained locked value in wrapped tokens
    const transformAmounts: IReducedToken[] = mainList.map((item, i) => {
      if (
        item.token_name.includes("Stake Key") ||
        item.token_name.includes("Vesting Key")
      ) {
        const newItem = {
          name: item.token_name.includes("Stake Key")
            ? item.token_name.split(" ")[0] + " (Staked)"
            : item.wrapped_tokens[0].token_name + " (Vested)",
          description: item.token_description,
          amount: adjustDecimals(
            item.wrapped_tokens[0].token_amount,
            item.wrapped_tokens[0].decimals
          ),
          value: item.wrapped_tokens[0].value_in_erg,
          tokenId: item.token_id,
          wrappedTokenIds: [item.wrapped_tokens[0].token_id],
          wrappedTokenNames: [item.wrapped_tokens[0].token_name],
          wrappedTokenAmounts: [
            adjustDecimals(
              item.wrapped_tokens[0].token_amount,
              item.wrapped_tokens[0].decimals
            ),
          ],
        };
        return newItem;
      }
      if (item.token_name.includes("Spectrum YF staking bundle")) {
        const newItem = {
          // name: item.wrapped_tokens[0].token_name.split('_')[1] + '/' + item.wrapped_tokens[0].token_name.split('_')[0] + ' Spectrum YF',
          name: `${item.wrapped_tokens[0].token_name
            .split("_")[1]
            .slice(0, 3)}/${item.wrapped_tokens[0].token_name
              .split("_")[0]
              .slice(0, 3)} YF (${fetchAcc})`,
          description: item.token_description,
          amount: adjustDecimals(item.token_amount, item.decimals),
          value:
            calculateWrappedTokensValue(item) /
            adjustDecimals(item.token_amount, item.decimals),
          tokenId: item.token_id,
          wrappedTokenIds:
            item.wrapped_tokens.length > 0
              ? flattenTokenIdsFromWrappedTokens(item.wrapped_tokens)
              : undefined,
          wrappedTokenNames:
            item.wrapped_tokens.length > 0
              ? flattenTokenNamesFromWrappedTokens(item.wrapped_tokens)
              : undefined,
          wrappedTokenAmounts:
            item.wrapped_tokens.length > 0
              ? flattenTokenAmountsFromWrappedTokens(item.wrapped_tokens)
              : undefined,
        };
        fetchAcc++;
        return newItem;
      }
      const newItem = {
        name: item.token_name,
        description: item.token_description,
        amount: adjustDecimals(item.token_amount, item.decimals),
        value:
          calculateWrappedTokensValue(item) /
          adjustDecimals(item.token_amount, item.decimals),
        tokenId: item.token_id,
        wrappedTokenIds:
          item.wrapped_tokens.length > 0
            ? item.wrapped_tokens.map((token) => token.token_id)
            : undefined,
        wrappedTokenNames:
          item.wrapped_tokens.length > 0
            ? item.wrapped_tokens.map((token) => token.token_name)
            : undefined,
        wrappedTokenAmounts:
          item.wrapped_tokens.length > 0
            ? item.wrapped_tokens.map((token) =>
              adjustDecimals(token.token_amount, token.decimals)
            )
            : undefined,
      };
      return newItem;
    });

    // get the value of the entire portfolio
    const totalTokensValue = transformAmounts.reduce(
      (acc, token) => acc + token.amount * token.value,
      0
    );
    setTotalValue(totalTokensValue);

    const totalValueLocked = transformAmounts
      .filter(
        (item) =>
          item.wrappedTokenIds?.length && item.wrappedTokenIds?.length > 0
      )
      .reduce((acc, token) => acc + token.amount * token.value, 0);
    setTotalValueLocked(totalValueLocked);

    // sort tokens by decending value
    const sortedTokens = transformAmounts.sort(
      (a, b) => b.amount * b.value - a.amount * a.value
    );
    setSortedFilteredTokensList(sortedTokens);

    const assetInfo = await fetchAssetInfo(collectablesList.map(item => item.token_id))

    // filter NFTs out for their processing
    const list = collectablesList.map((item, i) => {
      return {
        name: item.token_name,
        link: "/tokens/" + item.token_id,
        tokenId: item.token_id,
        qty:
          item.decimals !== 0
            ? item.token_amount / Math.pow(10, item.decimals)
            : item.token_amount,
        loading: true,
      };
    });
    setFilteredNfts(list);

    const fetchDataChunk = async (chunk: any) => {
      const additionalData = await tokenListInfo(chunk);
      setFilteredNfts((prevState) => {
        const newList = prevState.map((item) => {
          const apiItem = additionalData.find(
            (apiItem) => apiItem.tokenId === item.tokenId
          );
          return apiItem ? { ...item, ...apiItem } : item;
        });
        return newList;
      });
    };

    // get NFT info in smaller chunks
    const chunks = chunkArray(list, 8);
    for (const chunk of chunks) {
      await fetchDataChunk(chunk);
    }


    localStorage.setItem(
      "crux_portfolio_address_list",
      JSON.stringify(thisAddressList)
    );
  };

  const fetchAssetInfo = async (
    tokenIds: string[]
  ): Promise<AssetInfoV2Item[]> => {
    try {
      const endpoint = `${process.env.CRUX_API}/crux/asset_info_v2`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(tokenIds),
      });

      const data: AssetInfoV2Item[] = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching token data:", error);
      return [];
    }
  };

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const loadingNow = Object.values(loading).some((value) => value === true)
    setIsLoading(loadingNow)
  }, [loading])

  const handleChangeAddressList = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const addresses = event.target.value
    setAddressList(addresses);
  };

  const [apy, setApy] = useState(0)

  return (
    <Container>
      <Grid
        container
        sx={{ mb: 1 }}
        spacing={2}
        alignItems="center"
      >
        <Grid xs>
          <TextField
            id="wallet-addresses"
            variant="filled"
            value={addressList}
            onChange={handleChangeAddressList}
            fullWidth
            placeholder="Any number of wallet addresses, separated by commas"
          />
        </Grid>
        <Grid xs="auto">
          <Button variant="contained" onClick={() => fetchData(addressList.split(",").map((address) => address.trim()))}>
            Submit
          </Button>
        </Grid>
        <Grid>
          <CurrencyButton currency={currency} setCurrency={setCurrency} />
        </Grid>
      </Grid>
      <Grid
        container
        alignItems="stretch"
        spacing={2}
        sx={{ position: "relative", mb: 1 }}
      >
        <Grid xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", flexDirection: "column", display: "flex", alignItems: "center" }}>
            <Typography>
              Value
            </Typography>
            <Typography variant="h5">
              {currencies[currency]}{Number((currency === 'ERG' ? totalValue : totalValue * exchangeRate).toFixed(2)).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", textAlign: 'center' }}>
            <Typography>
              P+L Total
            </Typography>
            <Typography variant="h5">
              -
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", textAlign: 'center' }}>
            <Typography>
              24 Hour Change
            </Typography>
            <Typography variant="h5">
              -
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", textAlign: 'center' }}>
            <Typography>
              TVL
            </Typography>
            <Typography variant="h5">
              {currencies[currency]}{Number((currency === 'ERG' ? totalValueLocked : totalValueLocked * exchangeRate).toFixed(2)).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", height: "100%" }}>
            <TokenSummary
              totalValue={totalValue}
              tokenList={sortedFilteredTokensList}
              currency={currency}
              boxHeight={boxHeight}
              setBoxHeight={setBoxHeight}
              setLoading={setLoading}
              exchangeRate={exchangeRate}
            />
          </Paper>
        </Grid>
        <Grid xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
            <HistoricValues
              tokenList={sortedFilteredTokensList}
              totalValue={totalValue}
              currency={currency}
              exchangeRate={exchangeRate}
            />
          </Paper>
        </Grid>
        <Grid xs={12}>
          <Collectibles
            tokenList={filteredNfts}
          />
        </Grid>
        {/* <Grid xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
            <ValueLocked
              currency={currency}
              exchangeRate={exchangeRate}
              tokenList={sortedFilteredTokensList}
              boxHeight={boxHeight}
            />
          </Paper>
        </Grid>
        <Grid xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
            <FungibleCollectablesList
              tokenList={filteredFts}
              boxHeight={boxHeight}
              setBoxHeight={setBoxHeight}
            />
          </Paper>
        </Grid> */}
      </Grid>

      {/* <Grid
          container
          alignItems="stretch"
          spacing={3}
          sx={{ position: "relative", mb: 2 }}
        >
          <Grid xs={12} lg={9}>
            <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
              <Grid container spacing={4} direction={{ xs: "column", md: "row" }}>
                <Grid xs={12} md={4}>
                  <Balance
                    balance={totalValue}
                    setCurrency={setCurrency}
                    tvl={totalValueLocked}
                    currency={currency}
                    exchangeRate={exchangeRate}
                    apy={0}
                    pctChange={1.2}
                  />
                </Grid>
                <Grid
                  xs={12}
                  md={8}
                  container
                  direction={{ xs: "column", md: "row" }}
                >
                  <Grid>
                    {upMd ? <Divider orientation="vertical" /> : <Divider />}
                  </Grid>
                  <Grid xs>
                    <TokenSummary
                      totalValue={totalValue}
                      tokenList={sortedFilteredTokensList}
                      currency={currency}
                      boxHeight={boxHeight}
                      setBoxHeight={setBoxHeight}
                      setLoading={setLoading}
                      exchangeRate={exchangeRate}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid xs={12} sm={6} lg={3}>
            <Paper variant="outlined"
              sx={{ p: 3, width: "100%", height: "100%", position: "relative" }}
            >
              <NftList
                tokenList={filteredNfts}
                boxHeight={boxHeight}
                setBoxHeight={setBoxHeight}
              />
            </Paper>
          </Grid>
          <Grid xs={12} sm={6} lg={3} sx={{ position: "relative", zIndex: 10 }}>
            <Paper variant="outlined" sx={{ p: 3, width: "100%", height: "100%" }}>
              <ValueLocked
                currency={currency}
                exchangeRate={exchangeRate}
                tokenList={sortedFilteredTokensList}
                boxHeight={boxHeight}
              />
            </Paper>
          </Grid>
          <Grid xs={12} lg={9}>
            <Paper variant="outlined"
              sx={{
                py: 3,
                px: upSm ? 3 : 0,
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              <HistoricValues
                tokenList={sortedFilteredTokensList}
                totalValue={totalValue}
                currency={currency}
                exchangeRate={exchangeRate}
              />
            </Paper>
          </Grid>
        </Grid> */}


      <Positions
        currency={currency}
        setCurrency={setCurrency}
        addressList={submittedAddressList}
      />


      <StakedPositions
        currency={currency}
        setCurrency={setCurrency}
        addressList={submittedAddressList}
      />


      <LiquidityPositions
        currency={currency}
        setCurrency={setCurrency}
        addressList={submittedAddressList}
      />

    </Container>
  );
};

export default Portfolio;

// helper functions

const chunkArray = (array: any[], chunkSize: number) => {
  return Array.from(
    { length: Math.ceil(array.length / chunkSize) },
    (_, index) => {
      const start = index * chunkSize;
      const end = start + chunkSize;
      return array.slice(start, end);
    }
  );
};

const flattenTokenIdsFromWrappedTokens = (wrappedTokens: IPortfolioToken[]) => {
  let ids: string[] = [];
  for (const token of wrappedTokens) {
    ids.push(token.token_id);
    if (token.wrapped_tokens.length > 0) {
      ids = ids.concat(flattenTokenIdsFromWrappedTokens(token.wrapped_tokens));
    }
  }
  return ids;
};

const flattenTokenNamesFromWrappedTokens = (
  wrappedTokens: IPortfolioToken[]
) => {
  let names: string[] = [];
  for (const token of wrappedTokens) {
    names.push(token.token_name);
    if (token.wrapped_tokens.length > 0) {
      names = names.concat(
        flattenTokenNamesFromWrappedTokens(token.wrapped_tokens)
      );
    }
  }
  return names;
};

const flattenTokenAmountsFromWrappedTokens = (
  wrappedTokens: IPortfolioToken[]
) => {
  let amounts: number[] = [];
  for (const token of wrappedTokens) {
    amounts.push(adjustDecimals(token.token_amount, token.decimals));
    if (token.wrapped_tokens.length > 0) {
      amounts = amounts.concat(
        flattenTokenAmountsFromWrappedTokens(token.wrapped_tokens)
      );
    }
  }
  return amounts;
};

const testPortfolios = [
  {
    name: 'portfolio 1',
    addresses: [
      '9hgTSczegZZ6uyeGPJjTutG75E5H2uZ3RK6FYJZEYV1L41woeA5',
      '9gDRYMhFwz2FjAcyYxgSqbwTmRzbkkx6vMujcRPLJWuxWd57q1S'
    ]
  },
  {
    name: 'Only Dry',
    addresses: [
      '9gDRYMhFwz2FjAcyYxgSqbwTmRzbkkx6vMujcRPLJWuxWd57q1S'
    ]
  }
]