import { FC, useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  CircularProgress,
  IconButton,
  InputBase,
  TextField,
  Checkbox,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import TokenSort from "@components/tokens/TokenSort";
import TokenFilterOptions from "@components/tokens/Filters";
import { formatNumber } from "@lib/utils/general";
import { useRouter } from "next/router";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { currencies, Currencies } from "@lib/utils/currencies";
import { useInView } from "react-intersection-observer";
import BouncingDotsLoader from "@components/DotLoader";
import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";
import SearchIcon from "@mui/icons-material/Search";
import YoutubeSearchedForIcon from "@mui/icons-material/YoutubeSearchedFor";
import { trpc } from "@lib/trpc";
import PresetDropdown from "@components/tokens/PresetDropdown";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import StarToggle from "@components/StarToggle";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useWallet } from "@contexts/WalletContext";
import SkeletonTrending from "@components/skeleton/SkeletonTrending";

const Tokens: FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));
  const [loading, setLoading] = useState(false);
  const [ergExchange, setErgExchange] = useState(1);
  const [filteredTokens, setFilteredTokens] = useState<ITokenData[]>([]);
  const [queries, setQueries] = useState<IQueries>({ limit: 20, offset: 0 });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [noMore, setNoMore] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [view, inView] = useInView({
    threshold: 0,
  });

  const { sessionData, setNotSubscribedNotifyDialogOpen } = useWallet();
  const isSubscriber =
    sessionData?.user.privilegeLevel === "BASIC" ||
    sessionData?.user.privilegeLevel === "PRO" ||
    sessionData?.user.privilegeLevel === "ADMIN";

  /////////////////////////
  // START FILTERS STUFF //
  /////////////////////////
  const [currency, setCurrency] = useState<Currencies>("USD");
  const [timeframe, setTimeframe] = useState<ITimeframe>({
    filter_window: "Day",
  });
  const [filters, setFilters] = useState<IFilters>({
    liquidity_min: 100,
  });
  const [sorting, setSorting] = useState<ISorting>({
    sort_by: "Volume",
    sort_order: "Desc",
  });
  const [searchString, setSearchString] = useState("");
  const [userPresets, setUserPresets] = useState<
    { id: string; name: string }[]
  >([]);
  const [currentSelectedPreset, setCurrentSelectedPreset] = useState<
    string | null
  >(null);

  const getFilterPresets = trpc.savedSettings.getUsersFilterPresets.useQuery();
  const createPresetMutation =
    trpc.savedSettings.createNewFilterPreset.useMutation();
  const updatePresetMutation =
    trpc.savedSettings.updateSavedFilterPreset.useMutation();
  const deleteSavedFilterPresetMutation =
    trpc.savedSettings.deleteSavedFilterPreset.useMutation();
  const updateCurrentPreset =
    trpc.savedSettings.updateSavedFilterPreset.useMutation();

  const handleUpdateCurrentPreset = (presetId: string) => {
    const currentSettings = {
      id: presetId,
      presetName:
        userPresets.find((preset) => preset.id === presetId)?.name || "",
      timeframe: timeframe.filter_window,
      sort_by: sorting.sort_by,
      sort_order: sorting.sort_order,
      price_min: filters.price_min || undefined,
      price_max: filters.price_max || undefined,
      liquidity_min: filters.liquidity_min || undefined,
      liquidity_max: filters.liquidity_max || undefined,
      market_cap_min: filters.market_cap_min || undefined,
      market_cap_max: filters.market_cap_max || undefined,
      pct_change_min: filters.pct_change_min || undefined,
      pct_change_max: filters.pct_change_max || undefined,
      volume_min: filters.volume_min || undefined,
      volume_max: filters.volume_max || undefined,
      buys_min: filters.buys_min || undefined,
      buys_max: filters.buys_max || undefined,
      sells_min: filters.sells_min || undefined,
      sells_max: filters.sells_max || undefined,
      currency,
      searchString,
    };

    updateCurrentPreset.mutate(currentSettings, {
      onSuccess: (updatedPreset) => {
        getFilterPresets.refetch();
        setUserPresets((prevPresets) =>
          prevPresets.map((preset) =>
            preset.id === updatedPreset.id
              ? { ...preset, ...updatedPreset }
              : preset,
          ),
        );
        // Optionally, show a success message
        // showSuccessMessage('Preset updated successfully');
      },
      onError: (error) => {
        // Handle any errors, maybe show an error message
        console.error("Failed to update preset:", error);
        // showErrorMessage('Failed to update preset');
      },
    });
  };

  const handleDelete = (presetId: string) => {
    deleteSavedFilterPresetMutation.mutate(
      { id: presetId },
      {
        onSuccess: () => {
          setUserPresets(
            userPresets.filter((preset) => preset.id !== presetId),
          );
        },
      },
    );
  };

  useEffect(() => {
    if (getFilterPresets.data) {
      setUserPresets(
        getFilterPresets.data.map((preset) => ({
          id: preset.id,
          name: preset.presetName,
        })),
      );
    }
  }, [getFilterPresets.isFetched]);

  const handlePresetSelect = (presetId: string) => {
    const selectedPreset = getFilterPresets.data?.find(
      (preset) => preset.id === presetId,
    );
    console.log(selectedPreset);
    if (selectedPreset) {
      setFilters(
        Object.entries({
          price_min: selectedPreset.price_min,
          price_max: selectedPreset.price_max,
          liquidity_min: selectedPreset.liquidity_min,
          liquidity_max: selectedPreset.liquidity_max,
          market_cap_min: selectedPreset.market_cap_min,
          market_cap_max: selectedPreset.market_cap_max,
          pct_change_min: selectedPreset.pct_change_min,
          pct_change_max: selectedPreset.pct_change_max,
          volume_min: selectedPreset.volume_min,
          volume_max: selectedPreset.volume_max,
          buys_min: selectedPreset.buys_min,
          buys_max: selectedPreset.buys_max,
          sells_min: selectedPreset.sells_min,
          sells_max: selectedPreset.sells_max,
        }).reduce((acc, [key, value]) => {
          if (value != null) {
            acc[key as keyof IFilters] = value;
          }
          return acc;
        }, {} as IFilters),
      );
      setSorting({
        sort_by: selectedPreset.sort_by || "Volume",
        sort_order:
          selectedPreset.sort_order === "Asc"
            ? selectedPreset.sort_order
            : "Desc",
      });
      setTimeframe({
        filter_window: selectedPreset.timeframe as
          | "Hour"
          | "Day"
          | "Week"
          | "Month",
      });
      setCurrency((selectedPreset.currency as Currencies) || "USD");
      setSearchString(selectedPreset.searchString || "");
    }
  };

  const handleSaveCurrent = () => {
    const newPreset = {
      presetName: `Preset ${userPresets.length + 1}`,
      ...filters,
      ...sorting,
      timeframe: timeframe.filter_window,
      currency,
      searchString,
    };
    createPresetMutation.mutate(newPreset, {
      onSuccess: (data) => {
        setUserPresets([
          ...userPresets,
          { id: data.id, name: data.presetName },
        ]);
        setCurrentSelectedPreset(data.id);
        getFilterPresets.refetch();
      },
    });
  };

  const handleRename = (presetId: string, newName: string) => {
    updatePresetMutation.mutate(
      { id: presetId, presetName: newName, timeframe: timeframe.filter_window },
      {
        onSuccess: () => {
          setUserPresets(
            userPresets.map((preset) =>
              preset.id === presetId ? { ...preset, name: newName } : preset,
            ),
          );
        },
      },
    );
  };
  ///////////////////////
  // END FILTERS STUFF //
  ///////////////////////

  //////////////////////////
  // STARRED TOKENS STUFF //
  //////////////////////////

  const starredTokensQuery = trpc.starredTokens.getStarredTokens.useQuery();
  const updateStarredTokensMutation =
    trpc.starredTokens.updateStarredTokens.useMutation();

  const [starredTokens, setStarredTokens] = useState<string[]>([]);
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);

  console.log(starredTokens);
  console.log(showOnlyStarred);

  useEffect(() => {
    if (starredTokensQuery.data) {
      setStarredTokens(starredTokensQuery.data);
    }
  }, [starredTokensQuery.data]);

  const toggleStarredToken = (tokenId: string) => {
    const newStarredTokens = starredTokens.includes(tokenId)
      ? starredTokens.filter((id) => id !== tokenId)
      : [...starredTokens, tokenId];

    setStarredTokens(newStarredTokens);

    updateStarredTokensMutation.mutate(newStarredTokens, {
      onError: (error: any) => {
        console.error("Failed to update starred tokens:", error);
        // Revert the local state change
        setStarredTokens(starredTokensQuery.data || []);
        // Optionally show an error message to the user
      },
    });
  };

  const handlePremiumClick = () => {
    setNotSubscribedNotifyDialogOpen(true);
  };

  //////////////////////////////
  // END STARRED TOKENS STUFF //
  //////////////////////////////

  const handleCurrencyChange = (e: any, value: "USD" | "ERG") => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeframe: "Hour" | "Day" | "Week" | "Month",
  ) => {
    if (newTimeframe !== null && newTimeframe !== undefined)
      setTimeframe({ filter_window: newTimeframe });
  };

  async function fetchTokenData(
    filters: IFilters,
    sorting: ISorting,
    queries: IQueries,
    timeframe: ITimeframe,
    inputtedSearchString: string,
    starredOnly: boolean,
  ) {
    setLoading(true);
    try {
      setError(undefined);

      const endpoint = `${process.env.CRUX_API}/spectrum/token_list`;
      const payload = {
        ...filters,
        ...sorting,
        ...queries,
        ...timeframe,
        name_filter: inputtedSearchString,
        token_filter: starredOnly ? starredTokens : undefined,
      };
      // console.log(payload);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: IApiTokenData[] = await response.json();
      // console.log(data);
      if (data.length === 0) setNoMore(true);
      else {
        setNoMore(false);
        const awaitedData = await Promise.all(
          data.map((item) => {
            const tokenData = mapApiDataToTokenData(item);
            return tokenData;
          }),
        );
        if (queries.offset === 0) {
          setFilteredTokens(awaitedData);
          setErgExchange(data[0].erg_price_usd);
        } else {
          setFilteredTokens((prev) => [...prev, ...awaitedData]);
        }
        setQueries((prevQueries) => {
          return {
            ...prevQueries,
            offset: prevQueries.offset + 20,
          };
        });
      }
      // setInitialLoading(false)
    } catch (error) {
      console.error("Error fetching token data:", error);
      setError("Error loading tokens");
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setSearchLoading(false);
    }
  }

  const mapApiDataToTokenData = async ({
    name,
    ticker,
    id,
    volume,
    liquidity,
    buys,
    sells,
    market_cap,
    price_erg,
    erg_price_usd,
    ...item
  }: IApiTokenData): Promise<ITokenData> => {
    const hourChangeKey =
      currency === "USD" ? "hour_change_usd" : "hour_change_erg";
    const dayChangeKey =
      currency === "USD" ? "day_change_usd" : "day_change_erg";
    const weekChangeKey =
      currency === "USD" ? "week_change_usd" : "week_change_erg";
    const monthChangeKey =
      currency === "USD" ? "month_change_usd" : "month_change_erg";

    // Check for the icon locally first
    let url = await checkLocalIcon(id);

    // Otherwise, check the server for it
    if (!url) {
      url = await getIconUrlFromServer(id);
    }

    return {
      name,
      ticker,
      tokenId: id,
      icon: url || "",
      price: price_erg,
      pctChange1h: item[hourChangeKey],
      pctChange1d: item[dayChangeKey],
      pctChange1w: item[weekChangeKey],
      pctChange1m: item[monthChangeKey],
      vol: volume,
      liquidity,
      buys,
      sells,
      mktCap: market_cap,
    };
  };

  const fetchData = async (reset?: boolean) => {
    if (reset) {
      setQueries((prevQueries) => {
        return {
          ...prevQueries,
          offset: 0,
        };
      });
      setFilteredTokens([]);
      await fetchTokenData(
        filters,
        sorting,
        { ...queries, offset: 0 },
        timeframe,
        searchString,
        showOnlyStarred,
      );
    } else
      fetchTokenData(
        filters,
        sorting,
        queries,
        timeframe,
        searchString,
        showOnlyStarred,
      );
  };

   // page-load
  useEffect(() => {
    if (initialLoading) {
      fetchData();
      console.log('init')
      setInitialLoading(false)
    }
  }, []);

  // Reset the query to 0 and load the new list with appropriate filters and sorting
  useEffect(() => {
    if (!initialLoading) {
      setInitialLoading(true);
      // console.log('fetching filters or sorting or timeframe')
      fetchData(true);
    }
  }, [filters, sorting, timeframe, showOnlyStarred]);

  // grab the next 20 items as the user scrolls to the bottom
  useEffect(() => {
    if (inView && !loading && !noMore) {
      fetchData();
    }
    // console.log('inView')
  }, [inView]);

  useEffect(() => {
    if (!initialLoading) {
      setInitialLoading(true);
      fetchData(true);
    }
  }, [currency]);

  const numberFilters = Math.round(Object.keys(filters).length);

  const formatPercent = (pct: number) => {
    return (
      <Typography
        sx={{
          color:
            pct < 0
              ? theme.palette.down.main
              : pct > 0
                ? theme.palette.up.main
                : theme.palette.text.secondary,
        }}
      >
        {formatNumber(pct * 0.01, 2, true)}%
      </Typography>
    );
  };

  const handleSearchStringChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newString = e.target.value;
    setSearchString(newString);
    // console.log(searchString)
  };

  const handleEnterKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const [triggerSearchFetch, setTriggerSearchFetch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const handleSearchSubmit = () => {
    setSearchLoading(true);
    setQueries((prevQueries) => {
      return {
        ...prevQueries,
        offset: 0,
      };
    });
    setTriggerSearchFetch(true);
  };

  useEffect(() => {
    if (triggerSearchFetch) {
      fetchData(true);
      setTriggerSearchFetch(false);
    }
  }, [triggerSearchFetch]);

  const CurrencyToggleButton: FC = () => {
    return (
      <ToggleButtonGroup
        value={currency}
        exclusive
        onChange={handleCurrencyChange}
        size="small"
      >
        <ToggleButton value="USD">USD</ToggleButton>
        <ToggleButton value="ERG">Erg</ToggleButton>
      </ToggleButtonGroup>
    );
  };

  // State for top boxes
  const [topTrendingTokens, setTopTrendingTokens] = useState<ITokenData[]>([]);
  const [topGainers, setTopGainers] = useState<ITokenData[]>([]);
  const [topLosers, setTopLosers] = useState<ITokenData[]>([]);

  // Fetch helper
  const fetchTokensForTimeframe = async (
    timeframe: ITimeframe,
    callback: (tokens: ITokenData[]) => void,
  ) => {
    try {
      const endpoint = `${process.env.CRUX_API}/spectrum/token_list`;
      const payload = {
        ...timeframe,
        limit: 100,
        offset: 0,
        sort_by: "Volume",
        sort_order: "Desc",
        name_filter: "",
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data: IApiTokenData[] = await response.json();
      const awaitedData = await Promise.all(data.map(mapApiDataToTokenData));
      callback(awaitedData);
    } catch (error) {
      console.error("Error fetching hardcoded timeframe tokens:", error);
    }
  };

  // One-time fetch on load
  useEffect(() => {
    // Trending (Daily)
    fetchTokensForTimeframe({ filter_window: "Day" }, (tokens) => {
      const trending = tokens.slice(0, 3);

      setTopTrendingTokens(trending);
    });

    // Gainers & Losers (Daily)
    fetchTokensForTimeframe({ filter_window: "Day" }, (tokens) => {
      const gainers = [...tokens]
        .filter((token) => token.pctChange1d > 0)
        .sort((a, b) => b.pctChange1d - a.pctChange1d)
        .slice(0, 3);

      const losers = [...tokens]
        .filter((token) => token.pctChange1d < 0)
        .sort((a, b) => a.pctChange1d - b.pctChange1d)
        .slice(0, 3);

      setTopGainers(gainers);
      setTopLosers(losers);
    });
  }, []);

  return (
    <Container>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        {/* 🔥 Trending */}
        <Box
          sx={{
            flex: 1,
            minWidth: "250px",
            height: "165px",
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "8px",
            padding: 2,
            color: theme.palette.text.primary,
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            🔥 Trending
          </Typography>

        {loading ? (
          <SkeletonTrending />
        ) : (
          topTrendingTokens.map((token: any, index: number) => (
            <Box
              key={token.tokenId}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
                px: 1,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              onClick={() => router.push(`/tokens/${token.tokenId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/tokens/${token.tokenId}`);
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" sx={{ width: 20 }}>{index + 1}.</Typography>
                <Avatar src={token.icon} alt={token.name} sx={{ width: 24, height: 24 }} />
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {token.name}
                </Typography>
              </Box>
              <Typography variant="body1">
                Vol: {formatNumber(token.vol)} {currencies.ERG}
              </Typography>
            </Box>
          ))
        )}
        </Box>

        {/* 📈 Top Gainers */}
        <Box
          sx={{
            flex: 1,
            minWidth: "250px",
            height: "165px",
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "8px",
            padding: 2,
            color: theme.palette.text.primary,
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            📈 Top Gainers
          </Typography>
        
          {loading ? (
            <SkeletonTrending />
          ) : (
            topGainers.map((token, index) => (
            <Box
              key={token.tokenId}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
                px: 1,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              onClick={() => router.push(`/tokens/${token.tokenId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/tokens/${token.tokenId}`);
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" sx={{ width: 20 }}>
                  {index + 1}.
                </Typography>
                <Avatar
                  src={token.icon}
                  alt={token.name}
                  sx={{ width: 24, height: 24 }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {token.name}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ color: theme.palette.up.main }}>
                {formatPercent(token.pctChange1d * 100)}
              </Typography>
            </Box>
          ))
        )}
        </Box>

        {/* 📉 Top Losers */}
        <Box
          sx={{
            flex: 1,
            minWidth: "250px",
            height: "165px",
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "8px",
            padding: 2,
            color: theme.palette.text.primary,
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            📉 Top Losers
          </Typography>

        {loading ? (
          <SkeletonTrending />
        ) : (
          topLosers.map((token, index) => (
            <Box
              key={token.tokenId}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
                px: 1,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              onClick={() => router.push(`/tokens/${token.tokenId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/tokens/${token.tokenId}`);
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" sx={{ width: 20 }}>
                  {index + 1}.
                </Typography>
                <Avatar
                  src={token.icon}
                  alt={token.name}
                  sx={{ width: 24, height: 24 }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {token.name}
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{ color: theme.palette.down.main }}
              >
                {formatPercent(token.pctChange1d * 100)}
              </Typography>
            </Box>
          ))
        )}
        </Box>
      </Box>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: upLg ? "row" : "column",
          gap: 2,
        }}
      >
        <Box>
          <Grid
            container
            alignItems="center"
            spacing={2}
            justifyContent={{ xs: "center", md: "space-between" }}
          >
            <Grid xs="auto">
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  "& .default-text, & .hover-text": {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: "100%",
                  },
                  "& .default-text": {
                    display: "flex",
                  },
                  "& .hover-text": {
                    display: "none",
                  },
                  ...(!isSubscriber && {
                    "&:hover": {
                      color: theme.palette.getContrastText("#7bd1be"),
                      background: "#7bd1be!important",
                      borderRadius: "6px",
                      borderColor: "#7bd1be!important",
                      "& .default-text": {
                        display: "none",
                      },
                      "& .hover-text": {
                        display: "flex",
                        justifyContent: "center",
                        cursor: "pointer",
                      },
                    },
                  }),
                }}
              >
                <span className="default-text">
                  <StarToggle
                    checked={showOnlyStarred}
                    onChange={(e) => {
                      setShowOnlyStarred(e.target.checked);
                      // fetchData(true);
                    }}
                    disabled={initialLoading}
                  />
                </span>
                <Box
                  component="span"
                  className="hover-text"
                  onClick={handlePremiumClick}
                >
                  <Button
                    onClick={handlePremiumClick}
                    size="small"
                    sx={{
                      width: "36px",
                      minWidth: "36px",
                      height: "36px",
                      color: theme.palette.getContrastText("#7bd1be"),
                    }}
                  >
                    <LockOpenIcon color="inherit" />
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid xs="auto">
              <PresetDropdown
                presets={userPresets}
                onPresetSelect={handlePresetSelect}
                onSaveCurrent={handleSaveCurrent}
                onRename={handleRename}
                onDelete={handleDelete}
                onUpdateCurrent={handleUpdateCurrentPreset}
                currentSelectedPreset={currentSelectedPreset}
                setCurrentSelectedPreset={setCurrentSelectedPreset}
              />
            </Grid>
            <Grid xs="auto">
              <TokenSort sorting={sorting} setSorting={setSorting} />
            </Grid>
            <Grid xs="auto">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={timeframe.filter_window}
                onChange={handleTimeframeChange}
              >
                <ToggleButton value="Hour">H</ToggleButton>
                <ToggleButton value="Day">D</ToggleButton>
                <ToggleButton value="Week">W</ToggleButton>
                <ToggleButton value="Month">M</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid xs="auto">
              <Button
                variant="contained"
                onClick={() => setFilterModalOpen(!filterModalOpen)}
                startIcon={<FilterAltIcon />}
              >
                Filters {numberFilters > 0 && "(" + numberFilters + ")"}
              </Button>
            </Grid>
            <Grid sx={{ display: upLg ? "none" : "flex" }} xs="auto">
              <CurrencyToggleButton />
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            id="search-field"
            variant="filled"
            value={searchString}
            onChange={handleSearchStringChange}
            onKeyDown={handleEnterKeyPress}
            fullWidth
            placeholder="Search"
            disabled={searchLoading}
            sx={{
              "& .Mui-disabled": {
                borderColor: theme.palette.text.disabled,
              },
            }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={handleSearchSubmit}
                  aria-label="search"
                  edge="end"
                  sx={{ borderRadius: 0 }}
                >
                  {searchLoading ? <YoutubeSearchedForIcon /> : <SearchIcon />}
                </IconButton>
              ),
            }}
          />
        </Box>
        <Box sx={{ textAlign: "right", display: upLg ? "flex" : "none" }}>
          <CurrencyToggleButton />
        </Box>
      </Box>

      <TokenFilterOptions
        filters={filters}
        setFilters={setFilters}
        open={filterModalOpen}
        setOpen={setFilterModalOpen}
      />

      <Paper variant="outlined" sx={{ position: "relative" }}>
        {upLg ? (
          <>
            <Box sx={{ py: 1 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid xs={3}>
                  <Typography sx={{ ml: 2 }}>Token</Typography>
                </Grid>
                <Grid xs={2}>Price</Grid>
                <Grid xs={1}>H</Grid>
                <Grid xs={1}>D</Grid>
                <Grid xs={1}>W</Grid>
                <Grid xs={1}>M</Grid>
                <Grid xs={1}>
                  <Typography>Volume</Typography>
                  <Typography>Liquidity</Typography>
                </Grid>
                <Grid xs={1}>
                  <Typography>Transactions</Typography>
                  <Typography>Market Cap</Typography>
                </Grid>
                <Grid xs={1}>
                  <Typography>Buys</Typography>
                  <Typography>Sells</Typography>
                </Grid>
              </Grid>
            </Box>
            <Box
              sx={{
                // height: 'calc(100vh - 200px)',
                // overflowY: 'scroll',
                overflowX: "hidden",
              }}
            >
              {loading && initialLoading ? (
                <Box sx={{ position: "relative", minHeight: "300px" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <CircularProgress size={60} />
                    </Box>
                    <Typography>Loading assets...</Typography>
                  </Box>
                </Box>
              ) : error ? (
                <Box sx={{ position: "relative", minHeight: "300px" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ mb: 2 }}>{error}</Typography>
                    <Button
                      variant="outlined"
                      onClick={() => window.location.reload()}
                    >
                      Reload the page
                    </Button>
                  </Box>
                </Box>
              ) : (
                <>
                  {filteredTokens.map((token, i) => {
                    return (
                      <Box
                        key={`${token.tokenId}-${i}`}
                        sx={{
                          py: 1,
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                          userSelect: "none",
                          "&:hover": {
                            background: theme.palette.background.hover,
                            cursor: "pointer",
                          },
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/tokens/${token.tokenId}`);
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid xs={3}>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                                ml: 1,
                              }}
                            >
                              <Box>
                                <Checkbox
                                  sx={{
                                    "&:hover": { bgcolor: "transparent" },
                                  }}
                                  disableRipple
                                  icon={<StarBorderIcon />}
                                  checkedIcon={<StarIcon />}
                                  checked={starredTokens.includes(
                                    token.tokenId,
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Stop the event from bubbling up
                                  }}
                                  onChange={() =>
                                    toggleStarredToken(token.tokenId)
                                  }
                                />
                              </Box>
                              <Box sx={{ display: "flex" }}>
                                <Avatar
                                  src={token.icon}
                                  sx={{ width: "48px", height: "48px" }}
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Typography
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {token.name}
                                </Typography>
                                {/* <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.ticker.toUpperCase()}
                                      </Typography> */}
                              </Box>
                            </Box>
                          </Grid>
                          <Grid xs={2}>
                            {currencies[currency] +
                              formatNumber(
                                currency === "USD"
                                  ? token.price * ergExchange
                                  : token.price,
                                4,
                              )}
                          </Grid>
                          <Grid xs={1}>
                            {formatPercent(token.pctChange1h * 100)}
                          </Grid>
                          <Grid xs={1}>
                            {formatPercent(token.pctChange1d * 100)}
                          </Grid>
                          <Grid xs={1}>
                            {formatPercent(token.pctChange1w * 100)}
                          </Grid>
                          <Grid xs={1}>
                            {formatPercent(token.pctChange1m * 100)}
                          </Grid>
                          <Grid xs={1}>
                            <Typography>
                              V{" "}
                              {currencies[currency] +
                                formatNumber(
                                  currency === "USD"
                                    ? token.vol * ergExchange
                                    : token.vol,
                                  2,
                                )}
                            </Typography>
                            <Typography>
                              L{" "}
                              {currencies[currency] +
                                formatNumber(
                                  currency === "USD"
                                    ? token.liquidity * ergExchange
                                    : token.liquidity,
                                  2,
                                )}
                            </Typography>
                          </Grid>
                          <Grid xs={1}>
                            <Typography>
                              T {token.buys + token.sells}
                            </Typography>
                            <Typography>
                              M{" "}
                              {currencies[currency] +
                                formatNumber(
                                  currency === "USD"
                                    ? token.mktCap * ergExchange
                                    : token.mktCap,
                                  2,
                                )}
                            </Typography>
                          </Grid>
                          <Grid xs={1}>
                            <Typography sx={{ color: theme.palette.up.main }}>
                              B {token.buys}
                            </Typography>
                            <Typography sx={{ color: theme.palette.down.main }}>
                              S {token.sells}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                  <Box ref={view} sx={{ minHeight: "24px" }}>
                    {noMore && (
                      <Typography
                        color="text.secondary"
                        sx={{ my: 2, textAlign: "center", fontStyle: "italic" }}
                      >
                        All tokens loaded.
                      </Typography>
                    )}
                    {loading && <BouncingDotsLoader />}
                  </Box>
                </>
              )}
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ py: 1 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid xs={4} sm={6}>
                  <Typography sx={{ ml: 2 }}>Token</Typography>
                </Grid>
                <Grid xs={4} sm={3}>
                  <Typography>Price</Typography>
                  <Typography>% Change</Typography>
                </Grid>
                <Grid xs={4} sm={3}>
                  <Typography>Volume</Typography>
                  <Typography>Transactions</Typography>
                </Grid>
              </Grid>
            </Box>
            <Box
              sx={{
                // height: 'calc(70vh)',
                // overflowY: 'scroll',
                overflowX: "hidden",
              }}
            >
              {loading && initialLoading ? (
                <Box sx={{ position: "relative", minHeight: "300px" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <CircularProgress size={60} />
                    </Box>
                    <Typography>Loading assets...</Typography>
                  </Box>
                </Box>
              ) : error ? (
                <Box sx={{ position: "relative", minHeight: "300px" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ mb: 2 }}>{error}</Typography>
                    <Button
                      variant="outlined"
                      onClick={() => window.location.reload()}
                    >
                      Reload the page
                    </Button>
                  </Box>
                </Box>
              ) : (
                <>
                  {filteredTokens.map((token, i) => {
                    return (
                      <Box
                        key={`${token.tokenId}-${i}`}
                        sx={{
                          py: 1,
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                          userSelect: "none",
                          "&:hover": {
                            background: theme.palette.background.hover,
                            cursor: "pointer",
                          },
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/tokens/${token.tokenId}`);
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid xs>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 1,
                                ml: 1,
                              }}
                            >
                              <Box
                              // sx={{ display: { xs: 'none', sm: 'flex' } }}
                              >
                                <Avatar
                                  src={token.icon}
                                  sx={{
                                    width: { xs: "20px", sm: "36px" },
                                    height: { xs: "20px", sm: "36px" },
                                  }}
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Typography
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {token.name}
                                </Typography>
                                <Typography
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {token.ticker.toUpperCase()}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid xs={4} sm={3}>
                            <Typography>
                              {currencies[currency] +
                                formatNumber(
                                  currency === "USD"
                                    ? token.price * ergExchange
                                    : token.price,
                                  4,
                                )}
                            </Typography>
                            <Typography>
                              {formatPercent(token.pctChange1d * 100)}
                            </Typography>
                          </Grid>
                          <Grid xs={4} sm={3}>
                            <Typography>
                              V{" "}
                              {currencies[currency] +
                                formatNumber(
                                  currency === "USD"
                                    ? token.vol * ergExchange
                                    : token.vol,
                                  2,
                                )}
                            </Typography>
                            <Typography>
                              T {token.buys + token.sells}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                  <Box ref={view} sx={{ minHeight: "24px" }}>
                    {noMore && (
                      <Typography
                        color="text.secondary"
                        sx={{ my: 2, textAlign: "center", fontStyle: "italic" }}
                      >
                        All tokens loaded.
                      </Typography>
                    )}
                    {loading && <BouncingDotsLoader />}
                  </Box>
                </>
              )}
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Tokens;
