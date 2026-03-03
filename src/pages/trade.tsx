import React, { FC, useState, useEffect, useMemo, useCallback } from "react";
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
import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@lib/charts/charting_library";
import { TVChartContainer } from "@components/charts/AdvancedChart";
import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import { formatNumber } from "@lib/utils/general";
import { USE_TOKEN_ID } from "@lib/configs/paymentTokens";
import MarketOrderWidget from "@components/trade/MarketOrderWidget";
import RecentTradesPanel from "@components/trade/RecentTradesPanel";
import LimitOrderWidget from "@components/trade/LimitOrderWidget";
import OrderBook from "@components/trade/OrderBook";
import OpenOrdersPanel from "@components/trade/OpenOrdersPanel";
import OrderHistoryPanel from "@components/trade/OrderHistoryPanel";

const ERG_TOKEN_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";

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
  token_description: string;
}

const TradePage: FC = () => {
  const theme = useTheme();
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

  // Tab state for order type and order panels
  const [orderTab, setOrderTab] = useState(0); // 0 = Market, 1 = Limit
  const [ordersTab, setOrdersTab] = useState(0); // 0 = Open Orders, 1 = History
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);

  // User authentication for trade markers
  const { sessionStatus } = useWallet();
  const isAuthenticated = sessionStatus === "authenticated";

  const walletQuery = trpc.user.getWallets.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const userAddresses = useMemo(() => {
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
  }, [walletQuery.data]);

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
      }
    };
    fetchErgPrice();
  }, []);

  // Fetch ERG icon on mount
  useEffect(() => {
    const fetchErgIcon = async () => {
      const icon = await checkLocalIcon(ERG_TOKEN_ID);
      if (icon) {
        setQuoteToken((prev) => ({ ...prev, icon }));
      }
    };
    fetchErgIcon();
  }, []);

  // Search for tokens
  const handleSearchChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setSearchAnchorEl(e.currentTarget);

      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await fetch(
          `${process.env.CRUX_API}/crux/search_tokens?query=${encodeURIComponent(query)}&limit=10`,
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching tokens:", error);
      } finally {
        setSearchLoading(false);
      }
    },
    [],
  );

  // Select a token from search results
  const handleTokenSelect = useCallback(async (token: TokenSearchResult) => {
    setSearchResults([]);
    setSearchQuery("");
    setSearchAnchorEl(null);
    setLoading(true);

    try {
      // Fetch token icon
      let icon = await checkLocalIcon(token.token_id);
      if (!icon) {
        icon = await getIconUrlFromServer(token.token_id);
      }

      // Fetch full token info
      const response = await fetch(
        `${process.env.CRUX_API}/crux/token_info/${token.token_id}`,
      );
      if (response.ok) {
        const data = await response.json();

        const newToken: TokenInfo = {
          tokenId: token.token_id,
          name: data.token_name || token.token_name,
          ticker: data.token_name || token.token_name,
          icon: icon || "",
          decimals: data.decimals ?? 0,
          price: data.value_in_erg || 0,
        };

        setBaseToken(newToken);

        // Set up chart widget props
        setDefaultWidgetProps({
          symbol: newToken.name,
          interval: "1D" as ResolutionString,
          library_path: "/static/charting_library/",
          locale: "en",
          fullscreen: false,
          autosize: true,
        });
      }
    } catch (error) {
      console.error("Error fetching token info:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load default USE token on mount
  useEffect(() => {
    const loadDefaultToken = async () => {
      setLoading(true);
      try {
        const useSymbol: TokenSearchResult = {
          token_id: USE_TOKEN_ID,
          token_name: "USE",
          token_description: "USE Token",
        };
        await handleTokenSelect(useSymbol);
      } catch (error) {
        console.error("Error loading default token:", error);
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

    // Update chart
    setDefaultWidgetProps((prev) =>
      prev
        ? {
          ...prev,
          symbol: quoteToken.name,
        }
        : undefined,
    );
  }, [baseToken, quoteToken]);

  const handleSearchClickAway = () => {
    setSearchAnchorEl(null);
  };

  return (
    <Box sx={{ mx: 2, minHeight: "calc(100vh - 120px)" }}>
      {/* Header with Token Pair Selector */}
      <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
        {/* Token Search */}
        <Grid xs={12} sm={6} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              height: "100%",
              minHeight: 80,
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
                  placeholder="Search token..."
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
                          {searchResults.map((token) => (
                            <ListItem
                              key={token.token_id}
                              onClick={() => handleTokenSelect(token)}
                              sx={{
                                cursor: "pointer",
                                "&:hover": {
                                  bgcolor: theme.palette.action.hover,
                                },
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ width: 32, height: 32 }} src="" />
                              </ListItemAvatar>
                              <ListItemText
                                primary={token.token_name}
                                secondary={`${token.token_id.slice(0, 8)}...`}
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

        {/* Selected Pair Display */}
        <Grid xs={12} sm={6} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              height: "100%",
              minHeight: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.01)',
              backdropFilter: 'blur(8px)',
              borderRadius: 3,
            }}
          >
            {baseToken ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={baseToken.icon} sx={{ width: 32, height: 32, boxShadow: theme.shadows[2] }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
                    {baseToken.ticker}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  onClick={handleSwapTokens}
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'primary.main', color: 'common.white' }
                  }}
                >
                  <SwapVertIcon fontSize="small" />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={quoteToken.icon} sx={{ width: 32, height: 32, boxShadow: theme.shadows[2] }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
                    {quoteToken.ticker}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">
                No token selected
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Price Display */}
        <Grid xs={12} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              height: "100%",
              minHeight: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.01)',
              backdropFilter: 'blur(8px)',
              borderRadius: 3,
            }}
          >
            {baseToken ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatNumber(baseToken.price, 6)} <Typography component="span" variant="h6" sx={{ opacity: 0.7 }}>{quoteToken.ticker}</Typography>
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6, fontWeight: 500, mb: 0 }}>
                  ≈ ${formatNumber(baseToken.price * ergPrice, 4)} USD
                </Typography>
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">
                Select a token to see price
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* Left Column: Chart + (Open Orders | Recent Trades) */}
        <Grid xs={12} lg={8}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Chart Area */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: upMd ? 500 : 400,
                ...(!baseToken || loading || !defaultWidgetProps
                  ? {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }
                  : {}),
              }}
            >
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
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Chart not available
                </Typography>
              )}
            </Paper>

            {/* Bottom row: Open Orders + Recent Trades */}
            <Grid container spacing={2}>
              {/* User Orders Panel */}
              <Grid xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
                  <Tabs
                    value={ordersTab}
                    onChange={(_, v) => setOrdersTab(v)}
                    sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
                  >
                    <Tab label="Open Orders" />
                    <Tab label="Order History" />
                  </Tabs>
                  <Box sx={{ p: 2 }}>
                    {ordersTab === 0 ? (
                      <OpenOrdersPanel
                        baseToken={baseToken}
                        quoteToken={quoteToken}
                        refreshTrigger={orderRefreshTrigger}
                      />
                    ) : (
                      <OrderHistoryPanel
                        baseToken={baseToken}
                        quoteToken={quoteToken}
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Recent Trades */}
              <Grid xs={12} md={6}>
                <RecentTradesPanel
                  baseToken={baseToken}
                  quoteToken={quoteToken}
                  ergPrice={ergPrice}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Right Column: Order Widget + Order Book stacked */}
        <Grid xs={12} md={6} lg={4}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Order Widget with Tabs */}
            <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
              <Tabs
                value={orderTab}
                onChange={(_, v) => setOrderTab(v)}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Market" />
                <Tab label="Limit" />
              </Tabs>
              <Box sx={{ p: 2 }}>
                {orderTab === 0 ? (
                  <MarketOrderWidget
                    baseToken={baseToken}
                    quoteToken={quoteToken}
                    ergPrice={ergPrice}
                    disabled={!baseToken}
                  />
                ) : (
                  <LimitOrderWidget
                    baseToken={baseToken}
                    quoteToken={quoteToken}
                    ergPrice={ergPrice}
                    disabled={!baseToken}
                    onOrderCreated={() => setOrderRefreshTrigger((t) => t + 1)}
                  />
                )}
              </Box>
            </Paper>

            {/* Order Book */}
            <OrderBook baseToken={baseToken} quoteToken={quoteToken} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TradePage;
