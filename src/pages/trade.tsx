import * as Sentry from "@sentry/nextjs";
import ErrorBoundary from "@components/ErrorBoundary";
import React, { FC, useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ClickAwayListener,
  Popper,
  Fade,
  Tabs,
  Tab,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  ChartingLibraryWidgetOptions,
  IChartWidgetApi,
  ResolutionString,
} from "@lib/charts/charting_library";
import { TVChartContainer } from "@components/charts/AdvancedChart";
import { createTradeMarkerManager, TradeMarkerManager } from "@lib/charts/tradeMarkers";
import { getCachedIcon, resolveIcons as batchResolveIcons } from "@lib/utils/icons";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import { formatNumber, formatFullNumber, normalizeTicker } from "@lib/utils/general";
import { USE_TOKEN_ID, ERG_TOKEN_ID } from "@lib/configs/paymentTokens";
import MarketOrderWidget from "@components/trade/MarketOrderWidget";
import TradeTabsPanel from "@components/trade/TradeTabsPanel";
import LimitOrderWidget from "@components/trade/LimitOrderWidget";
import OrderBook from "@components/trade/OrderBook";
import { useRouter } from "next/router";

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface TokenSearchResult {
  token_id: string;
  token_name: string;
  token_decimals: number;
  quote_token_id: string;
  quote_token_name: string;
  quote_token_decimals: number;
  liquidity: number;
}

const TradePage: FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));

  // Token pair state
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo>({
    tokenId: ERG_TOKEN_ID,
    name: "Ergo",
    ticker: "ERG",
    icon: "",
    decimals: 9,
    price: 1,
  });

  // Token search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchIcons, setSearchIcons] = useState<Record<string, string>>({});
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const searchOpen = Boolean(searchAnchorEl) && searchResults.length > 0;

  // Chart state
  const [defaultWidgetProps, setDefaultWidgetProps] = useState<
    Partial<ChartingLibraryWidgetOptions> | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);

  // ERG price for USD conversion
  const [ergPrice, setErgPrice] = useState<number>(0);

  // LP position indicator
  const [lpShare, setLpShare] = useState<number | null>(null);

  // 24h token stats
  const [tokenStats, setTokenStats] = useState<{
    dayChangeErg: number;
    volumeErg: number;
    volume: number;
  } | null>(null);

  // Tab state for order type and order panels
  const [orderTab, setOrderTab] = useState(0); // 0 = Limit, 1 = Market
  const [externalLimitPrice, setExternalLimitPrice] = useState<number | null>(null);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [, setOpenOrderCount] = useState<number | null>(null);
  const [, setOrderHistoryCount] = useState<number | null>(null);

  // Chart refs for trade markers and order lines
  const chartRef = useRef<IChartWidgetApi | null>(null);
  const markerManagerRef = useRef<TradeMarkerManager | null>(null);
  const orderLinesRef = useRef<any[]>([]);

  // User authentication for trade markers
  const { sessionStatus, dAppWallet } = useWallet();
  const isAuthenticated = sessionStatus === "authenticated";

  const walletQuery = trpc.user.getWallets.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const userAddresses = useMemo(() => {
    if (dAppWallet.connected && dAppWallet.addresses.length > 0) {
      return dAppWallet.addresses;
    }
    if (!walletQuery.data) return [];

    const extractAddresses = (
      wallets: typeof walletQuery.data.walletList | undefined,
    ) =>
      wallets?.flatMap((w) => [
        w.changeAddress,
        ...(w.usedAddresses || []),
        ...(w.unusedAddresses || []),
      ]) || [];

    const addresses = [
      ...extractAddresses(walletQuery.data.walletList),
      ...extractAddresses(walletQuery.data.addedWalletList),
    ];

    return [...new Set(addresses)];
  }, [dAppWallet, walletQuery.data]);

  // Fetch ERG price on mount
  useEffect(() => {
    const fetchErgPrice = async () => {
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/coingecko/erg_price`,
        );
        const data = await response.json();
        if (data.price) {
          setErgPrice(data.price);
        }
      } catch (error) {
        console.error("Error fetching ERG price:", error);
        Sentry.captureException(error);
      }
    };
    fetchErgPrice();
  }, []);

  // Fetch ERG icon on mount
  useEffect(() => {
    const fetchErgIcon = async () => {
      const icon = await getCachedIcon(ERG_TOKEN_ID);
      if (icon) {
        setQuoteToken((prev) => ({ ...prev, icon }));
      }
    };
    fetchErgIcon();
  }, []);

  // Search for tokens (with 300ms debounce)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setSearchAnchorEl(e.currentTarget);

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `${process.env.CRUX_API}/crux/search_tokens?query=${encodeURIComponent(query)}&limit=10`,
          );
          if (response.ok) {
            const data: TokenSearchResult[] = await response.json();
            setSearchResults(data);

            // Resolve icons for results in single batch
            const uncachedIds = data
              .map((t) => t.token_id)
              .filter((id) => !searchIcons[id]);
            if (uncachedIds.length > 0) {
              const resolved = await batchResolveIcons(uncachedIds);
              if (Object.keys(resolved).length > 0) {
                setSearchIcons((prev) => ({ ...prev, ...resolved }));
              }
            }
          }
        } catch (error) {
          console.error("Error searching tokens:", error);
        Sentry.captureException(error);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [],
  );

  // Select a pair from search results
  const handleTokenSelect = useCallback(async (token: TokenSearchResult) => {
    setSearchResults([]);
    setSearchQuery("");
    setSearchAnchorEl(null);
    setLoading(true);

    try {
      const baseIcon = getCachedIcon(token.token_id) || "";
      const quoteIcon = getCachedIcon(token.quote_token_id) || "";

      // Fetch price from token_info
      let price = 0;
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/crux/token_info/${token.token_id}`,
        );
        if (response.ok) {
          const data = await response.json();
          price = data.value_in_erg || 0;
        }
      } catch { /* price stays 0 */ }

      const newBaseToken: TokenInfo = {
        tokenId: token.token_id,
        name: token.token_name,
        ticker: normalizeTicker(token.token_name),
        icon: baseIcon,
        decimals: token.token_decimals,
        price,
      };

      const newQuoteToken: TokenInfo = {
        tokenId: token.quote_token_id,
        name: token.quote_token_name,
        ticker: normalizeTicker(token.quote_token_name),
        icon: quoteIcon,
        decimals: token.quote_token_decimals,
        price: 1,
      };

      setBaseToken(newBaseToken);
      setQuoteToken(newQuoteToken);

      // Set up chart widget props
      // Symbol format: {TOKEN}_{BASE} e.g. "USE" (defaults to ERG), "CRUX_USE"
      const chartSymbol = newQuoteToken.tokenId === ERG_TOKEN_ID
        ? newBaseToken.name
        : `${newBaseToken.name}_${newQuoteToken.name}`;
      setDefaultWidgetProps({
        symbol: chartSymbol,
        interval: "1D" as ResolutionString,
        library_path: "/static/charting_library/",
        locale: "en",
        fullscreen: false,
        autosize: true,
      });
    } catch (error) {
      console.error("Error fetching token info:", error);
      Sentry.captureException(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load default USE token on mount
  useEffect(() => {
    const loadDefaultToken = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/crux/search_tokens?query=USE&limit=10`,
        );
        if (response.ok) {
          const results: TokenSearchResult[] = await response.json();
          const useToken = results.find((t) => t.token_id === USE_TOKEN_ID);
          if (useToken) {
            await handleTokenSelect(useToken);
            return;
          }
        }
        // Fallback if API fails
        await handleTokenSelect({
          token_id: USE_TOKEN_ID,
          token_name: "USE",
          token_decimals: 2,
          quote_token_id: ERG_TOKEN_ID,
          quote_token_name: "ERG",
          quote_token_decimals: 9,
          liquidity: 0,
        });
      } catch (error) {
        console.error("Error loading default token:", error);
        Sentry.captureException(error);
      } finally {
        setLoading(false);
      }
    };
    loadDefaultToken();
  }, [handleTokenSelect]);

  // Swap base and quote tokens
  const handleSwapTokens = useCallback(() => {
    if (!baseToken) return;

    const temp = baseToken;
    setBaseToken({
      tokenId: quoteToken.tokenId,
      name: quoteToken.name,
      ticker: quoteToken.ticker,
      icon: quoteToken.icon,
      decimals: quoteToken.decimals,
      price: 1 / (temp.price || 1),
    });
    setQuoteToken({
      tokenId: temp.tokenId,
      name: temp.name,
      ticker: temp.ticker,
      icon: temp.icon,
      decimals: temp.decimals,
      price: temp.price,
    });

    // Update chart - new base is old quote, new quote is old base
    const newBase = quoteToken.name;
    const newQuoteId = temp.tokenId;
    const chartSymbol = newQuoteId === ERG_TOKEN_ID
      ? newBase
      : `${newBase}_${temp.name}`;
    setDefaultWidgetProps((prev) =>
      prev
        ? {
          ...prev,
          symbol: chartSymbol,
        }
        : undefined,
    );
  }, [baseToken, quoteToken]);

  const handleSearchClickAway = () => {
    setSearchAnchorEl(null);
  };

  const [externalLimitAmount, setExternalLimitAmount] = useState<number | null>(null);

  const handleOrderBookPriceClick = useCallback((price: number, amount?: number) => {
    setOrderTab(0); // Switch to Limit tab
    setExternalLimitPrice(price);
    setExternalLimitAmount(amount ?? null);
  }, []);

  // Load open order price lines on chart
  const loadOrderLines = useCallback(async (chart: IChartWidgetApi) => {
    // Clear existing lines
    orderLinesRef.current.forEach((line) => {
      try { line.remove(); } catch {}
    });
    orderLinesRef.current = [];

    if (userAddresses.length === 0 || !baseToken) return;

    try {
      const allOrders: any[] = [];
      for (const address of userAddresses.slice(0, 5)) {
        const params = new URLSearchParams({
          owner_address: address,
          status: "open,partial",
          limit: "50",
        });
        const response = await fetch(
          `${process.env.CRUX_API}/dex/orders?${params}`,
        );
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result)) allOrders.push(...result);
        }
      }

      // Deduplicate by order_id
      const uniqueOrders = allOrders.filter(
        (order, idx, self) => idx === self.findIndex((o) => o.order_id === order.order_id),
      );

      const pairOrders = uniqueOrders.filter((order) => {
        const givenId = order.given_token_id || ERG_TOKEN_ID;
        const takenId = order.taken_token_id || ERG_TOKEN_ID;
        return (
          (givenId === quoteToken.tokenId && takenId === baseToken.tokenId) ||
          (givenId === baseToken.tokenId && takenId === quoteToken.tokenId)
        );
      });

      for (const order of pairOrders) {
        // Determine side and price (same logic as OpenOrdersPanel)
        const givenIsQuote =
          order.given_token_id === null ||
          order.given_token_id === ERG_TOKEN_ID ||
          order.given_token_id === quoteToken.tokenId;
        const side = givenIsQuote ? "buy" : "sell";

        if (order.price_denominator === 0) continue;
        const rawRatio = order.price_numerator / order.price_denominator;
        const givenDec = order.given_token_decimals || 9;
        const takenDec = order.taken_token_decimals || 9;
        const price = side === "buy"
          ? Math.pow(10, takenDec) / (rawRatio * Math.pow(10, givenDec))
          : (rawRatio * Math.pow(10, givenDec)) / Math.pow(10, takenDec);

        if (price <= 0 || !isFinite(price)) continue;

        // Calculate display amount
        let amount: number;
        if (side === "buy") {
          const originalQuote = order.original_given_amount / Math.pow(10, givenDec);
          amount = price > 0 ? originalQuote / price : 0;
        } else {
          amount = order.original_given_amount / Math.pow(10, givenDec);
        }

        const isBuy = side === "buy";
        const color = isBuy ? "#4caf50" : "#f44336";

        try {
          const line = chart.createOrderLine()
            .setPrice(price)
            .setText(isBuy ? "BUY" : "SELL")
            .setQuantity(formatNumber(amount, 2))
            .setLineColor(color)
            .setBodyBackgroundColor(color)
            .setBodyTextColor("#ffffff")
            .setQuantityBackgroundColor(color)
            .setQuantityTextColor("#ffffff");

          orderLinesRef.current.push(line);
        } catch (e) {
          console.error("Error creating order line:", e);
          Sentry.captureException(e);
        }
      }
    } catch (error) {
      console.error("Error loading order lines:", error);
      Sentry.captureException(error);
    }
  }, [userAddresses, baseToken, quoteToken]);

  // Chart ready handler — sets up trade markers and order lines
  const handleChartReady = useCallback((chart: IChartWidgetApi, container: HTMLElement) => {
    // Clean up previous
    if (markerManagerRef.current) {
      markerManagerRef.current.destroy();
      markerManagerRef.current = null;
    }

    chartRef.current = chart;

    // Trade markers: show buy/sell arrows for connected wallet
    if (baseToken && userAddresses.length > 0) {
      const manager = createTradeMarkerManager(chart, baseToken.tokenId, userAddresses, container);
      markerManagerRef.current = manager;

      // Load markers for initial visible range
      const range = chart.getVisibleRange();
      manager.loadMarkers(range.from, range.to);

      // Reload markers on scroll/zoom with debounce
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      chart.onVisibleRangeChanged().subscribe(null, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (markerManagerRef.current) {
            const range = chart.getVisibleRange();
            markerManagerRef.current.loadMarkers(range.from, range.to);
          }
        }, 500);
      });
    }

    // Order price lines
    loadOrderLines(chart);
  }, [baseToken, userAddresses, loadOrderLines]);

  // Refresh order lines when orders change
  useEffect(() => {
    if (chartRef.current) {
      loadOrderLines(chartRef.current);
    }
  }, [orderRefreshTrigger, loadOrderLines]);

  // Cleanup trade markers on unmount
  useEffect(() => {
    return () => {
      if (markerManagerRef.current) {
        markerManagerRef.current.destroy();
        markerManagerRef.current = null;
      }
    };
  }, []);

  // Fetch LP position for current pair
  useEffect(() => {
    setLpShare(null);
    if (!baseToken || userAddresses.length === 0) return;
    const fetchLpShare = async () => {
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/dex/lp_positions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_addresses: userAddresses,
              limit: 50,
              offset: 0,
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.positions) {
            // Find position matching current pair (check both token directions)
            const match = data.positions.find(
              (p: any) =>
                (p.base_token.token_id === baseToken.tokenId &&
                  p.quote_token.token_id === quoteToken.tokenId) ||
                (p.base_token.token_id === quoteToken.tokenId &&
                  p.quote_token.token_id === baseToken.tokenId),
            );
            if (match) {
              setLpShare(match.share_of_pool);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching LP position:", error);
        Sentry.captureException(error);
      }
    };
    fetchLpShare();
  }, [baseToken?.tokenId, quoteToken?.tokenId, userAddresses]);

  // Fetch 24h token stats
  useEffect(() => {
    setTokenStats(null);
    if (!baseToken) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/spectrum/token_list`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token_filter: [baseToken.tokenId],
              limit: 1,
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const entry = data[0];
            setTokenStats({
              dayChangeErg: entry.day_change_erg,
              volumeErg: entry.volume_erg,
              volume: entry.volume,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching token stats:", error);
        Sentry.captureException(error);
      }
    };
    fetchStats();
  }, [baseToken?.tokenId]);

  return (
    <Box sx={{ mx: 2, minHeight: "calc(100vh - 120px)" }}>
      {/* Header with Token Pair Selector */}
      <Grid container spacing={2} sx={{ mb: 2, mt: 0.5, alignItems: "stretch" }}>
        {/* Token Search */}
        <Grid xs={12} sm={6} md={5}>
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              height: "100%",
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.01)',
              backdropFilter: 'blur(8px)',
              borderRadius: 3,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 10px ${theme.palette.primary.main}33`
              }
            }}
          >
            <ClickAwayListener onClickAway={handleSearchClickAway}>
              <Box sx={{ position: "relative", width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name or ticker (e.g. USE, CRUX)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {searchLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <SearchIcon color="action" />
                        )}
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />
                <Popper
                  open={searchOpen}
                  anchorEl={searchAnchorEl}
                  placement="bottom-start"
                  transition
                  sx={{ zIndex: 1300, width: searchAnchorEl?.clientWidth }}
                >
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={200}>
                      <Paper
                        elevation={4}
                        sx={{
                          mt: 1,
                          maxHeight: 300,
                          overflow: "auto",
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <List dense>
                          {searchResults.map((token, index) => (
                            <ListItem
                              key={`${token.token_id}-${token.quote_token_id}`}
                              onClick={() => handleTokenSelect(token)}
                              sx={{
                                cursor: "pointer",
                                "&:hover": {
                                  bgcolor: theme.palette.action.hover,
                                },
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ width: 32, height: 32 }} src={searchIcons[token.token_id] || ""} />
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${token.token_name} / ${token.quote_token_name}`}
                                secondary={`Liquidity: ${formatFullNumber(token.liquidity, 2)} ERG`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Fade>
                  )}
                </Popper>
              </Box>
            </ClickAwayListener>
          </Paper>
        </Grid>

        {/* Pair Price Display - compact horizontal ticker */}
        <Grid xs={12} sm={6} md={7}>
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 1,
              height: "100%",
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.01)',
              backdropFilter: 'blur(8px)',
              borderRadius: 3,
              cursor: baseToken ? 'pointer' : 'default',
              transition: 'all 0.2s',
              '&:hover': baseToken ? {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 10px ${theme.palette.primary.main}33`
              } : {},
            }}
            onClick={baseToken ? handleSwapTokens : undefined}
            role={baseToken ? "button" : undefined}
            aria-label={baseToken ? "Swap base and quote tokens" : undefined}
          >
            {baseToken ? (
              <>
                {/* Pair + Price */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Avatar src={baseToken.icon} sx={{ width: 20, height: 20 }} />
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
                    {baseToken.ticker}/{quoteToken.ticker}
                  </Typography>
                  <SwapVertIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                  <Typography component="span" sx={{ fontWeight: 600, fontSize: '1.15rem', ml: 0.5 }}>
                    {formatFullNumber(baseToken.price, 6)}
                  </Typography>
                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    ≈${formatFullNumber(
                      baseToken.tokenId === ERG_TOKEN_ID
                        ? ergPrice
                        : baseToken.price * ergPrice,
                      2
                    )}
                  </Typography>
                </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {tokenStats && (
                    <>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: tokenStats.dayChangeErg >= 0
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                        }}
                      >
                        {tokenStats.dayChangeErg >= 0 ? '+' : ''}
                        {tokenStats.dayChangeErg.toFixed(2)}%
                      </Typography>
                      <Typography
                        component="span"
                        sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
                      >
                        Vol: {formatFullNumber(tokenStats.volumeErg, 1)} ERG
                        {ergPrice > 0 && ` ($${formatFullNumber(tokenStats.volume, 0)})`}
                      </Typography>
                    </>
                  )}
                  {lpShare !== null && (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: theme.palette.primary.main,
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/liquidity');
                      }}
                    >
                      LP: {(lpShare * 100).toFixed(2)}%
                    </Typography>
                  )}
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" variant="body2">
                No token selected
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content: 3-column layout on large screens */}
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        {/* Left Column: Chart */}
        <Grid xs={12} lg={chartFullscreen ? 12 : 7} order={{ xs: 2, md: 2, lg: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Chart Area */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                position: "relative",
                flex: 1,
                minHeight: 0,
                ...(!baseToken || loading || !defaultWidgetProps
                  ? {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }
                  : {}),
              }}
            >
              {baseToken && defaultWidgetProps && !loading && (
                <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newState = !showMarkers;
                      setShowMarkers(newState);
                      markerManagerRef.current?.setEnabled(newState);
                    }}
                    sx={{
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "background.hover" },
                    }}
                  >
                    {showMarkers ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setChartFullscreen((f) => !f)}
                    sx={{
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "background.hover" },
                    }}
                  >
                    {chartFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                  </IconButton>
                </Box>
              )}
              {!baseToken ? (
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="text.secondary">
                    Search for a token to start trading
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Use the search box above to find tokens
                  </Typography>
                </Box>
              ) : loading ? (
                <CircularProgress />
              ) : defaultWidgetProps ? (
                <Box sx={{ width: "100%", height: "100%" }}>
                  <TVChartContainer
                    defaultWidgetProps={defaultWidgetProps}
                    currency="ERG"
                    height="100%"
                    onChartReady={handleChartReady}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Chart not available
                </Typography>
              )}
            </Paper>
          </Box>
        </Grid>

        {/* Middle Column: Order Book (full height) */}
        <Grid xs={12} md={6} lg={2.5} order={{ xs: 3, md: 3, lg: 2 }} sx={{ display: chartFullscreen ? "none" : "flex" }}>
          <Box sx={{ flex: 1 }}>
            <OrderBook baseToken={baseToken} quoteToken={quoteToken} onPriceClick={handleOrderBookPriceClick} />
          </Box>
        </Grid>

        {/* Right Column: Trade Widget */}
        <Grid xs={12} md={6} lg={2.5} order={{ xs: 1, md: 1, lg: 3 }} sx={{ display: chartFullscreen ? "none" : "flex" }}>
          <Paper variant="outlined" sx={{ p: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", transition: 'border-color 0.2s', '&:hover': { borderColor: 'rgba(254,107,139,0.35)' } }}>
            <Tabs
              value={orderTab}
              onChange={(_, v) => setOrderTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Limit" />
              <Tab label="Market" />
            </Tabs>
            <Box sx={{ p: 2 }}>
              {orderTab === 0 ? (
                <LimitOrderWidget
                  baseToken={baseToken}
                  quoteToken={quoteToken}
                  ergPrice={ergPrice}
                  disabled={!baseToken}
                  onOrderCreated={() => setOrderRefreshTrigger((t) => t + 1)}
                  externalPrice={externalLimitPrice}
                  externalAmount={externalLimitAmount}
                  onExternalPriceConsumed={() => {
                    setExternalLimitPrice(null);
                    setExternalLimitAmount(null);
                  }}
                />
              ) : (
                <MarketOrderWidget
                  baseToken={baseToken}
                  quoteToken={quoteToken}
                  ergPrice={ergPrice}
                  disabled={!baseToken}
                  onSwitchToLimit={() => setOrderTab(0)}
                />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Full-width Trade Tabs: Recent Trades / Open Orders / Order History */}
      {!chartFullscreen && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid xs={12}>
            <TradeTabsPanel
              baseToken={baseToken}
              quoteToken={quoteToken}
              ergPrice={ergPrice}
              onTradeClick={handleOrderBookPriceClick}
              orderRefreshTrigger={orderRefreshTrigger}
              userAddresses={userAddresses}
              onOpenOrderCountChange={setOpenOrderCount}
              onOrderHistoryCountChange={setOrderHistoryCount}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default function TradePageWithBoundary() {
  return (
    <ErrorBoundary>
      <TradePage />
    </ErrorBoundary>
  );
}
