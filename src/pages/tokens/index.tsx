import { FC, useState, useEffect } from 'react';
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
  TextField
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import TokenSort from '@components/tokens/TokenSort'
import TokenFilterOptions from '@components/tokens/Filters'
import { formatNumber } from '@lib/utils/general';
import { useRouter } from 'next/router';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { currencies, Currencies } from '@lib/utils/currencies';
import { useInView } from "react-intersection-observer";
import BouncingDotsLoader from '@components/DotLoader';
import { checkLocalIcon, getIconUrlFromServer } from '@lib/utils/icons';
import SearchIcon from '@mui/icons-material/Search';
import YoutubeSearchedForIcon from '@mui/icons-material/YoutubeSearchedFor';


const Tokens: FC = () => {
  const theme = useTheme()
  const router = useRouter()
  const upLg = useMediaQuery(theme.breakpoints.up('lg'))
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState<Currencies>('USD')
  const [ergExchange, setErgExchange] = useState(1)
  const [filteredTokens, setFilteredTokens] = useState<ITokenData[]>([])
  const [filters, setFilters] = useState<IFilters>({})
  const [sorting, setSorting] = useState<ISorting>({ sort_by: 'Volume', sort_order: 'Desc' })
  const [queries, setQueries] = useState<IQueries>({ limit: 20, offset: 0 });
  const [timeframe, setTimeframe] = useState<ITimeframe>({ filter_window: 'Day' });
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [noMore, setNoMore] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [view, inView] = useInView({
    threshold: 0,
  });
  const [searchString, setSearchString] = useState('')

  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeframe: 'Hour' | 'Day' | 'Week' | 'Month',
  ) => {
    if (newTimeframe !== null && newTimeframe !== undefined) setTimeframe({ filter_window: newTimeframe });
  };

  async function fetchTokenData(
    filters: IFilters,
    sorting: ISorting,
    queries: IQueries,
    timeframe: ITimeframe,
    inputtedSearchString: string
  ) {
    setLoading(true);
    try {
      setError(undefined)

      const endpoint = `${process.env.CRUX_API}/spectrum/token_list`;
      const payload = {
        ...filters,
        ...sorting,
        ...queries,
        ...timeframe,
        "name_filter": inputtedSearchString
      };
      // console.log(payload);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data: IApiTokenData[] = await response.json();
      // console.log(data);
      if (data.length === 0) setNoMore(true)
      else {
        setNoMore(false)
        const awaitedData = await Promise.all(data.map((item) => {
          const tokenData = mapApiDataToTokenData(item)
          return tokenData
        }))
        if (queries.offset === 0) {
          setFilteredTokens(awaitedData)
          setErgExchange(data[0].erg_price_usd)
        }
        else {
          setFilteredTokens(prev => [...prev, ...awaitedData])
        }
        setQueries(prevQueries => {
          return {
            ...prevQueries,
            offset: prevQueries.offset + 20
          }
        })
      }
      // setInitialLoading(false)
    } catch (error) {
      console.error('Error fetching token data:', error);
      setError('Error loading tokens')
    } finally {
      setLoading(false);
      setInitialLoading(false)
      setSearchLoading(false)
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
    const hourChangeKey = currency === "USD" ? "hour_change_usd" : "hour_change_erg";
    const dayChangeKey = currency === "USD" ? "day_change_usd" : "day_change_erg";
    const weekChangeKey = currency === "USD" ? "week_change_usd" : "week_change_erg";
    const monthChangeKey = currency === "USD" ? "month_change_usd" : "month_change_erg";

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
      icon: url || '',
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

      setQueries(prevQueries => {
        return {
          ...prevQueries,
          offset: 0
        }
      })
      setFilteredTokens([])
      await fetchTokenData(filters, sorting, { ...queries, offset: 0 }, timeframe, searchString);
    }
    else fetchTokenData(filters, sorting, queries, timeframe, searchString);
  };

  // // page-load
  // useEffect(() => {
  //   if (initialLoading) {
  //     fetchData();
  //     console.log('init')
  //     setInitialLoading(false)
  //   }
  // }, []);

  // Reset the query to 0 and load the new list with appropriate filters and sorting
  useEffect(() => {
    if (!initialLoading) {
      setInitialLoading(true)
      // console.log('fetching filters or sorting or timeframe')
      fetchData(true);
    }
  }, [filters, sorting, timeframe]);

  // grab the next 20 items as the user scrolls to the bottom
  useEffect(() => {
    if (inView && !loading && !noMore) {
      fetchData();
    }
    // console.log('inView')
  }, [inView]);

  useEffect(() => {
    if (!initialLoading) {
      setInitialLoading(true)
      fetchData(true);
    }
  }, [currency])

  const numberFilters = Math.round(Object.keys(filters).length / 2)

  const formatPercent = (pct: number) => {
    return (
      <Typography
        sx={{
          color: pct < 0 ? theme.palette.down.main : pct > 0 ? theme.palette.up.main : theme.palette.text.secondary
        }}
      >
        {formatNumber(pct * 0.01, 2, true)}%
      </Typography>
    )
  }

  const handleSearchStringChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newString = e.target.value
    setSearchString(newString)
    // console.log(searchString)
  }

  const handleEnterKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const [triggerSearchFetch, setTriggerSearchFetch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const handleSearchSubmit = () => {
    setSearchLoading(true)
    setQueries(prevQueries => {
      return {
        ...prevQueries,
        offset: 0
      }
    })
    setTriggerSearchFetch(true)
  }

  useEffect(() => {
    if (triggerSearchFetch) {
      fetchData(true);
      setTriggerSearchFetch(false)
    }
  }, [triggerSearchFetch])

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
    )
  }

  return (
    <Container>
      <Box sx={{ mb: 2, display: 'flex', flexDirection: upLg ? 'row' : 'column', gap: 2 }}>
        <Box>
          <Grid container alignItems="center" spacing={2} justifyContent="space-between">
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
                <ToggleButton value="Hour">
                  H
                </ToggleButton>
                <ToggleButton value="Day">
                  D
                </ToggleButton>
                <ToggleButton value="Week">
                  W
                </ToggleButton>
                <ToggleButton value="Month">
                  M
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid xs="auto">
              <Button
                variant="contained"
                onClick={() => setFilterModalOpen(!filterModalOpen)}
                startIcon={<FilterAltIcon />}
              >
                Filters {numberFilters > 0 && '(' + numberFilters + ')'}
              </Button>
            </Grid>
            <Grid sx={{ display: upLg ? 'none' : 'flex' }} xs="auto">
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
              '& .Mui-disabled': {
                borderColor: theme.palette.text.disabled
              }
            }}
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleSearchSubmit} aria-label="search" edge="end" sx={{ borderRadius: 0 }}>
                  {searchLoading ? <YoutubeSearchedForIcon /> : <SearchIcon />}
                </IconButton>
              )
            }}
          />
        </Box>
        <Box sx={{ textAlign: 'right', display: upLg ? 'flex' : 'none' }}>
          <CurrencyToggleButton />
        </Box>
      </Box>

      <TokenFilterOptions filters={filters} setFilters={setFilters} open={filterModalOpen} setOpen={setFilterModalOpen} />

      <Paper variant="outlined" sx={{ position: 'relative' }}>
        {upLg
          ? (
            <>
              <Box sx={{ py: 1 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid xs={3}>
                    <Typography sx={{ ml: 2 }}>
                      Token
                    </Typography>
                  </Grid>
                  <Grid xs={2}>
                    Price
                  </Grid>
                  <Grid xs={1}>
                    H
                  </Grid>
                  <Grid xs={1}>
                    D
                  </Grid>
                  <Grid xs={1}>
                    W
                  </Grid>
                  <Grid xs={1}>
                    M
                  </Grid>
                  <Grid xs={1}>
                    <Typography>
                      Volume
                    </Typography>
                    <Typography>
                      Liquidity
                    </Typography>
                  </Grid>
                  <Grid xs={1}>
                    <Typography>
                      Transactions
                    </Typography>
                    <Typography>
                      Market Cap
                    </Typography>
                  </Grid>
                  <Grid xs={1}>
                    <Typography>
                      Buys
                    </Typography>
                    <Typography>
                      Sells
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <Box sx={{
                // height: 'calc(100vh - 200px)', 
                // overflowY: 'scroll',
                overflowX: 'hidden'
              }}>
                {loading && initialLoading
                  ? (
                    <Box sx={{ position: 'relative', minHeight: '300px' }}>
                      <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <Box sx={{ mb: 2 }}>
                          <CircularProgress size={60} />
                        </Box>
                        <Typography>
                          Loading assets...
                        </Typography>
                      </Box>
                    </Box>
                  ) : error ? (
                    <Box sx={{ position: 'relative', minHeight: '300px' }}>
                      <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <Typography sx={{ mb: 2 }}>
                          {error}
                        </Typography>
                        <Button variant="outlined" onClick={() => window.location.reload()}>
                          Reload the page
                        </Button>
                      </Box>
                    </Box>
                  )
                    : (
                      <>
                        {filteredTokens.map((token, i) => {
                          return (
                            <Box key={`${token.tokenId}-${i}`}
                              sx={{
                                py: 1,
                                background: i % 2 ? '' : theme.palette.background.paper,
                                userSelect: 'none',
                                '&:hover': {
                                  background: theme.palette.background.hover,
                                  cursor: 'pointer'
                                }
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                router.push(`/tokens/${token.tokenId}`)
                              }}
                            >
                              <Grid container spacing={2} alignItems="center">
                                <Grid xs={3}>
                                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, ml: 1 }}>
                                    <Box sx={{ display: 'flex' }}>
                                      <Avatar src={token.icon} sx={{ width: '48px', height: '48px' }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.name}
                                      </Typography>
                                      <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.ticker.toUpperCase()}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                                <Grid xs={2}>
                                  {currencies[currency] + formatNumber(currency === 'USD' ? token.price * ergExchange : token.price, 4)}
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
                                    V {currencies[currency] + formatNumber(currency === 'USD' ? token.vol * ergExchange : token.vol, 2)}
                                  </Typography>
                                  <Typography>
                                    L {currencies[currency] + formatNumber(currency === 'USD' ? token.liquidity * ergExchange : token.liquidity, 2)}
                                  </Typography>
                                </Grid>
                                <Grid xs={1}>
                                  <Typography>
                                    T {token.buys + token.sells}
                                  </Typography>
                                  <Typography>
                                    M {currencies[currency] + formatNumber(currency === 'USD' ? token.mktCap * ergExchange : token.mktCap, 2)}
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
                          )
                        })}
                        <Box ref={view} sx={{ minHeight: '24px' }}>
                          {noMore &&
                            <Typography color="text.secondary" sx={{ my: 2, textAlign: 'center', fontStyle: 'italic' }}>
                              All tokens loaded.
                            </Typography>
                          }
                          {loading && <BouncingDotsLoader />}
                        </Box>
                      </>
                    )}
              </Box>
            </>
          )
          : (
            <>
              <Box sx={{ py: 1 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid xs={4} sm={6}>
                    <Typography sx={{ ml: 2 }}>
                      Token
                    </Typography>
                  </Grid>
                  <Grid xs={4} sm={3}>
                    <Typography>
                      Price
                    </Typography>
                    <Typography>
                      % Change
                    </Typography>
                  </Grid>
                  <Grid xs={4} sm={3}>
                    <Typography>
                      Volume
                    </Typography>
                    <Typography>
                      Transactions
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <Box sx={{
                // height: 'calc(70vh)', 
                // overflowY: 'scroll', 
                overflowX: 'hidden'
              }}>
                {loading && initialLoading
                  ? (
                    <Box sx={{ position: 'relative', minHeight: '300px' }}>
                      <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <Box sx={{ mb: 2 }}>
                          <CircularProgress size={60} />
                        </Box>
                        <Typography>
                          Loading assets...
                        </Typography>
                      </Box>
                    </Box>
                  ) :

                  error ? (
                    <Box sx={{ position: 'relative', minHeight: '300px' }}>
                      <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <Typography sx={{ mb: 2 }}>
                          {error}
                        </Typography>
                        <Button variant="outlined" onClick={() => window.location.reload()}>
                          Reload the page
                        </Button>
                      </Box>
                    </Box>
                  )
                    : (
                      <>
                        {filteredTokens.map((token, i) => {
                          return (
                            <Box key={`${token.tokenId}-${i}`}
                              sx={{
                                py: 1,
                                background: i % 2 ? '' : theme.palette.background.paper,
                                userSelect: 'none',
                                '&:hover': {
                                  background: theme.palette.background.hover,
                                  cursor: 'pointer'
                                }
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                router.push(`/tokens/${token.tokenId}`)
                              }}
                            >
                              <Grid container spacing={2} alignItems="center">
                                <Grid xs>
                                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, ml: 1 }}>
                                    <Box
                                    // sx={{ display: { xs: 'none', sm: 'flex' } }}
                                    >
                                      <Avatar src={token.icon} sx={{ width: { xs: '20px', sm: '36px' }, height: { xs: '20px', sm: '36px' } }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.name}
                                      </Typography>
                                      <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {token.ticker.toUpperCase()}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                                <Grid xs={4} sm={3}>
                                  <Typography>
                                    {currencies[currency] + formatNumber(currency === 'USD' ? token.price * ergExchange : token.price, 4)}
                                  </Typography>
                                  <Typography>
                                    {formatPercent(token.pctChange1d * 100)}
                                  </Typography>
                                </Grid>
                                <Grid xs={4} sm={3}>
                                  <Typography>
                                    V {currencies[currency] + formatNumber(currency === 'USD' ? token.vol * ergExchange : token.vol, 2)}
                                  </Typography>
                                  <Typography>
                                    T {token.buys + token.sells}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          )
                        })}
                        <Box ref={view} sx={{ minHeight: '24px' }}>
                          {noMore &&
                            <Typography color="text.secondary" sx={{ my: 2, textAlign: 'center', fontStyle: 'italic' }}>
                              All tokens loaded.
                            </Typography>
                          }
                          {loading && <BouncingDotsLoader />}
                        </Box>
                      </>)}
              </Box>
            </>
          )}
      </Paper>
    </Container >
  )
}

export default Tokens