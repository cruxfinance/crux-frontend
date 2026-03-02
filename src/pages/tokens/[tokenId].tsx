import React, { FC, useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Button,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  BottomNavigation,
  BottomNavigationAction,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { useRouter } from "next/router";
import { formatNumber } from "@lib/utils/general";
import { currencies, Currencies } from "@lib/utils/currencies";
import TradeHistory from "@components/tokenInfo/TradeHistory";
import TokenStats from "@components/tokenInfo/TokenStats";
import SwapWidget from "@components/tokenInfo/SwapWidget";
import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@lib/charts/charting_library";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import InfoIcon from "@mui/icons-material/Info";
import HistoryIcon from "@mui/icons-material/History";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { scroller } from "react-scroll";
import TvChart from "@components/tokenInfo/TvChart";
import { checkLocalIcon } from "@lib/utils/icons";
import { TVChartContainer } from "@components/charts/AdvancedChart";
import { useAlert } from "@lib/contexts/AlertContext";
import { USE_TOKEN_ID } from "@lib/configs/paymentTokens";

export interface TokenDataPlus extends ITokenData {
  totalMinted: number;
  lockedSupply: number;
  liquidSupply: number;
  burnedSupply: number;
  description: string;
}

const TokenInfo: FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const tokenId = router.query.tokenId as string;
  const tradingPair = undefined;
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenDataPlus | null>(null);
  const [currency, setCurrency] = useState<Currencies>("ERG");
  const [exchangeRate, setExchangeRate] = useState(1);
  // const [isScriptReady, setIsScriptReady] = useState(false)
  const [defaultWidgetProps, setDefaultWidgetProps] = useState<
    Partial<ChartingLibraryWidgetOptions> | undefined
  >(undefined);
  const [navigation, setNavigation] = useState("stats");
  const { addAlert } = useAlert();
  const [isGraphInverted, setIsGraphInverted] = useState(false);

  const handleCopy = () => {
    if (tokenId) {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tokenId).then(() => {
          addAlert("success", "Token ID copied to clipboard");
        }).catch((err) => {
          fallbackCopy(tokenId);
        });
      } else {
        fallbackCopy(tokenId);
      }
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        addAlert("success", "Token ID copied to clipboard");
      } else {
        addAlert("error", "Failed to copy Token ID");
      }
    } catch (err) {
      addAlert("error", "Failed to copy Token ID");
    }
    document.body.removeChild(textArea);
  };

  const getExchangeRate = async () => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.price) setExchangeRate(data.price);
      else throw new Error("Unable to fetch Ergo price data");
    } catch (error) {
      console.error("Error fetching Ergo price data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeHistory = async (tokenId: string) => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/crux/token_info/${tokenId}`;
      // const payload = {
      //   token_id: tokenId
      // };
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify(payload)
      });

      const data: TokenInfoApi = await response.json();
      const isLocalIcon = await checkLocalIcon(tokenId);
      const thisTokenInfo = {
        name: data.token_name,
        ticker: data.token_name,
        tokenId: tokenId,
        icon: isLocalIcon ?? "",
        price: data.value_in_erg,
        pctChange1h: 0,
        pctChange1d: 0,
        pctChange1w: 0,
        pctChange1m: 0,
        vol: 0,
        volErg: 0,
        volUse: 0,
        liquidity: 0,
        liquidityErg: 0,
        liquidityUse: 0,
        buys: 0,
        sells: 0,
        mktCap:
          (data.minted - data.burned_supply) *
          (currency === "ERG"
            ? data.value_in_erg
            : data.value_in_erg * exchangeRate),
        totalMinted: data.minted,
        lockedSupply: data.locked_supply,
        liquidSupply: data.liquid_supply,
        burnedSupply: data.burned_supply,
        description: data.token_description,
      };

      if (thisTokenInfo !== null && thisTokenInfo.name !== undefined) {
        setDefaultWidgetProps({
          symbol: thisTokenInfo.name,
          interval: "1D" as ResolutionString,
          library_path: "/static/charting_library/",
          locale: "en",
          // charts_storage_url: "https://saveload.tradingview.com",
          // charts_storage_api_version: "1.1",
          // client_id: "tradingview.com",
          // user_id: "public_user_id",
          fullscreen: false,
          autosize: true,
        });
      }
      setTokenInfo(thisTokenInfo);
    } catch (error) {
      console.error("Error fetching token data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenId) {
      getExchangeRate();
      fetchTradeHistory(tokenId);
    }
  }, [tokenId]);

  const handleCurrencyChange = (e: any, value: "USE" | "ERG") => {
    if (value !== null) {
      setCurrency(value);
      setTokenInfo((prev) => {
        if (prev)
          return {
            ...prev,
            mktCap:
              (prev.totalMinted - prev.burnedSupply) *
              (value === "ERG" ? prev.price : prev.price * exchangeRate),
          };
        else return null;
      });
    }
  };
  return (
    <Box id="stats" sx={{ mx: 2 }}>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: loading ? "1" : "0",
          width: "100vw",
          height: "100vh",
          background: "rgba(24,28,33,1)",
          zIndex: 999,
          color: "#fff",
          transition: "opacity 500ms",
          pointerEvents: loading ? "auto" : "none",
        }}
      >
        <CircularProgress
          color="inherit"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </Box>
      {!loading && tokenInfo && (
        <>
          <Grid
            container
            justifyContent="space-between"
            alignItems="flex-end"
            sx={{ mb: 2 }}
          >
            <Grid>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Avatar src={tokenInfo.icon} />
                <Typography variant="h3" sx={{ lineHeight: 1 }}>
                  {tokenInfo.name}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>
                  {isGraphInverted ? (
                    <>
                      <b>{currency === "USE" ? "USD" : currency}</b>/{tokenInfo.ticker}
                    </>
                  ) : (
                    <>
                      <b>{tokenInfo.ticker}</b>/{currency === "USE" ? "USE" : "ERG"}
                    </>
                  )}
                </Typography>
                {tokenId === USE_TOKEN_ID && currency === "ERG" && (
                  <IconButton
                    onClick={() => setIsGraphInverted(!isGraphInverted)}
                    size="small"
                    sx={{
                      p: 0.5,
                      color: isGraphInverted ? 'primary.main' : 'inherit',
                      '&:hover': { background: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    <SwapHorizIcon sx={{ fontSize: "1.2rem" }} />
                  </IconButton>
                )}
                <Tooltip title="Copy Token ID">
                  <IconButton onClick={handleCopy} size="small" sx={{ p: 0.5 }}>
                    <ContentCopyIcon sx={{ fontSize: "1rem", opacity: 0.7 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid sx={{ textAlign: "right" }}>
              <ToggleButtonGroup
                value={currency}
                exclusive
                onChange={handleCurrencyChange}
                sx={{ mb: 1 }}
                size="small"
              >
                <ToggleButton value="USE" sx={{ gap: 1 }}>
                  <Avatar
                    src="/icons/tokens/a55b8735ed1a99e46c2c89f8994aacdf4b1109bdcf682f1e5b34479c6e392669.png"
                    sx={{ width: 18, height: 18, background: 'transparent' }}
                  />
                  USE
                </ToggleButton>
                <ToggleButton value="ERG" sx={{ gap: 1 }}>
                  <Avatar
                    src="/icons/tokens/0000000000000000000000000000000000000000000000000000000000000000.svg"
                    sx={{ width: 18, height: 18, background: 'transparent' }}
                  />
                  Erg
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="h4">
                1{isGraphInverted ? (currency === "USE" ? "USD" : currency) : tokenInfo.ticker} ={" "}
                {isGraphInverted ? "" : currencies[currency]}
                {isGraphInverted
                  ? (currency === "USE"
                    ? formatNumber(1 / ((tokenInfo?.price || 1) * exchangeRate), 4)
                    : formatNumber(1 / (tokenInfo?.price || 1), 4))
                  : (currency === "USE"
                    ? formatNumber(tokenInfo.price * exchangeRate, 4)
                    : formatNumber(tokenInfo.price, 4))}
                {isGraphInverted ? ` ${tokenInfo.ticker}` : ""}
              </Typography>
            </Grid>
          </Grid>

          {!upMd && (
            <Box sx={{ display: "flex", flex: "0 0 300px", mb: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
                <TokenStats currency={currency} tokenInfo={tokenInfo} />
              </Paper>
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
            <Box
              sx={{ display: "flex", flex: 1, flexDirection: "column" }}
              id="chart"
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  width: "100%",
                  maxWidth: upMd
                    ? "calc(100vw - 354px)"
                    : upSm
                      ? "calc(100vw - 56px)"
                      : "calc(100vw - 40px)",
                  mb: 2,
                  position: "relative",
                }}
              >
                {defaultWidgetProps !== undefined && (
                  // <TvChart defaultWidgetProps={defaultWidgetProps} currency={currency} />
                  <TVChartContainer
                    defaultWidgetProps={{
                      ...defaultWidgetProps,
                      symbol: (isGraphInverted && tokenId === USE_TOKEN_ID) ? "Ergo" : tokenInfo.name
                    }}
                    currency={(isGraphInverted && tokenId === USE_TOKEN_ID) ? "USE" : currency}
                  />
                )}
              </Paper>
              {upLg && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, width: "100%", position: "relative" }}
                  id="history"
                >
                  <TradeHistory
                    currency={currency}
                    tokenId={tokenId}
                    tradingPair={tradingPair ? tradingPair : "ERG"}
                    tokenTicker={tokenInfo.ticker}
                    exchangeRate={exchangeRate}
                    inverted={isGraphInverted}
                  />
                </Paper>
              )}
            </Box>
            {upMd && (
              <Box sx={{ display: "flex", flex: "0 0 300px", mb: 2 }}>
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ position: "sticky", top: "16px" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        width: "100%",
                        height: "fit-content",
                        mb: 2,
                      }}
                    >
                      <TokenStats currency={currency} tokenInfo={tokenInfo} />
                    </Paper>
                    <Box id="swap">
                      <SwapWidget
                        tokenId={tokenId}
                        tokenName={tokenInfo.name}
                        tokenTicker={tokenInfo.ticker}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
          {!upLg && (
            <>
              <Paper
                sx={{
                  p: 2,
                  width: "100%",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 100px)",
                  mb: 2,
                }}
                id="history"
              >
                <TradeHistory
                  currency={currency}
                  tokenId={tokenId}
                  tradingPair={tradingPair ? tradingPair : "ERG"}
                  tokenTicker={tokenInfo.ticker}
                  exchangeRate={exchangeRate}
                  inverted={isGraphInverted}
                />
              </Paper>
              <Box id="swap">
                <SwapWidget
                  tokenId={tokenId}
                  tokenName={tokenInfo.name}
                  tokenTicker={tokenInfo.ticker}
                />
              </Box>
            </>
          )}
        </>
      )}
      {!upSm && (
        <Paper
          variant="outlined"
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 11500,
          }}
        >
          <BottomNavigation
            showLabels
            value={navigation}
            onChange={(event, newValue) => {
              setNavigation(newValue);
            }}
          >
            <BottomNavigationAction
              label="Stats"
              icon={<InfoIcon />}
              onClick={() =>
                scroller.scrollTo("stats", {
                  duration: 500,
                  offset: -50,
                  smooth: true,
                })
              }
            />
            <BottomNavigationAction
              label="Chart"
              icon={<CandlestickChartIcon />}
              onClick={() =>
                scroller.scrollTo("chart", {
                  duration: 500,
                  offset: -50,
                  smooth: true,
                })
              }
            />
            <BottomNavigationAction
              label="Trades"
              icon={<HistoryIcon />}
              onClick={() =>
                scroller.scrollTo("history", {
                  duration: 500,
                  offset: -50,
                  smooth: true,
                })
              }
            />
            <BottomNavigationAction
              label="Swap"
              icon={<SwapHorizIcon />}
              onClick={() =>
                scroller.scrollTo("swap", {
                  duration: 500,
                  offset: -50,
                  smooth: true,
                })
              }
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default TokenInfo;
