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
  Avatar
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import TokenSort from '@components/tokens/SortBy'
import TokenFilterOptions from '@components/tokens/Filters'
import { formatNumber } from '@src/utils/general';
import { useRouter } from 'next/router';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { currencies, Currencies } from '@src/utils/currencies';

export interface ITokenData {
  name: string;
  ticker: string;
  tokenId: string;
  icon: string;
  price: number;
  pctChange1h: number;
  pctChange1d: number;
  pctChange1w: number;
  pctChange1m: number;
  vol: number;
  liquidity: number;
  buys: number;
  sells: number;
  mktCap: number;
}

interface IApiTokenData {
  id: string;
  ticker: string;
  name: string;
  exchanges: string[];
  price_erg: number;
  erg_price_usd: number;
  hour_change_erg: number;
  hour_change_usd: number;
  day_change_erg: number;
  day_change_usd: number;
  week_change_erg: number;
  week_change_usd: number;
  month_change_erg: number;
  month_change_usd: number;
  volume: number;
  liquidity: number;
  market_cap: number;
  buys: number;
  sells: number;
  unique_buys: number;
  unique_sells: number;
  created: number;
}

export interface IFilters {
  priceMin?: number;
  priceMax?: number;
  liquidityMin?: number;
  liquidityMax?: number;
  mktCapMin?: number;
  mktCapMax?: number;
  pctChangeMin?: number;
  pctChangeMax?: number;
  volMin?: number;
  volMax?: number;
  buysMin?: number;
  buysMax?: number;
  sellsMin?: number;
  sellsMax?: number;
}

export interface ISorting {
  sort_by?: string;
  sort_order?: 'Desc' | 'Asc';
}

export interface IQueries {
  limit?: number;
  offset?: number;
}

export interface ITimeframe {
  selectedPeriod?: '1h' | '1d' | '1w' | '1m';
}

const Tokens: FC = () => {
  const theme = useTheme()
  const router = useRouter()
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState<Currencies>('USD')
  const [ergExchange, setErgExchange] = useState(1)
  const [apiTokenData, setApiTokenData] = useState<IApiTokenData[]>([])
  const [filteredTokens, setFilteredTokens] = useState<ITokenData[]>([])
  const [filters, setFilters] = useState<IFilters>({})
  const [sorting, setSorting] = useState<ISorting>({ sort_by: 'Volume', sort_order: 'Desc' })
  const [queries, setQueries] = useState<IQueries>({ limit: 100, offset: 0 });
  const [timeframe, setTimeframe] = useState<ITimeframe>({ selectedPeriod: '1d' });
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeframe: '1h' | '1d' | '1w' | '1m',
  ) => {
    if (newTimeframe !== null) setTimeframe({ selectedPeriod: newTimeframe });
  };

  async function fetchTokenData(
    filters: IFilters,
    sorting: ISorting,
    queries: IQueries,
    timeframe: ITimeframe
  ): Promise<IApiTokenData[]> {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/spectrum/token_list`;
      const payload = {
        // ...filters,
        ...sorting,
        ...queries,
        // ...timeframe
      };
      console.log(JSON.stringify(payload));
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      console.log(response);
      const data: IApiTokenData[] = await response.json();
      setApiTokenData(data);
      return data;
    } catch (error) {
      console.error('Error fetching token data:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  const mapApiDataToTokenData = ({
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
  }: IApiTokenData): ITokenData => {
    const hourChangeKey = currency === "USD" ? "hour_change_usd" : "hour_change_erg";
    const dayChangeKey = currency === "USD" ? "day_change_usd" : "day_change_erg";
    const weekChangeKey = currency === "USD" ? "week_change_usd" : "week_change_erg";
    const monthChangeKey = currency === "USD" ? "month_change_usd" : "month_change_erg";

    return {
      name,
      ticker,
      tokenId: id,
      icon: 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/' + id + '.svg',
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

  useEffect(() => {
    const fetchData = async () => {
      const apiDataArray = await fetchTokenData(filters, sorting, queries, timeframe);
      const mappedDataArray = apiDataArray.map(mapApiDataToTokenData);
      setErgExchange(apiDataArray[0].erg_price_usd)
      setFilteredTokens(mappedDataArray);
    };

    fetchData();
  }, [filters, sorting, queries, timeframe]);

  useEffect(() => {
    const mappedDataArray = apiTokenData.map(mapApiDataToTokenData);
    setFilteredTokens(mappedDataArray);
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

  return (
    <Container>
      <Grid container justifyContent="space-between" alignItems="flex-end" sx={{ mb: 2 }}>
        <Grid>
          <Grid container alignItems="center" sx={{ mb: 2 }} spacing={2}>
            <Grid>
              <TokenSort sorting={sorting} setSorting={setSorting} />
            </Grid>
            <Grid>
              <ToggleButtonGroup
                exclusive
                value={timeframe.selectedPeriod}
                onChange={handleTimeframeChange}
              >
                <ToggleButton value="1h">
                  H
                </ToggleButton>
                <ToggleButton value="1d">
                  D
                </ToggleButton>
                <ToggleButton value="1w">
                  W
                </ToggleButton>
                <ToggleButton value="1m">
                  M
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid>
              <Button
                variant="contained"
                onClick={() => setFilterModalOpen(!filterModalOpen)}
                startIcon={<FilterAltIcon />}
              >
                Filters {numberFilters > 0 && '(' + numberFilters + ')'}
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ textAlign: 'right' }}>
          <ToggleButtonGroup
            value={currency}
            exclusive
            onChange={handleCurrencyChange}
            sx={{ mb: 1 }}
            size="small"
          >
            <ToggleButton value="USD">USD</ToggleButton>
            <ToggleButton value="ERG">Erg</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      <TokenFilterOptions filters={filters} setFilters={setFilters} open={filterModalOpen} setOpen={setFilterModalOpen} />


      <Paper>
        <Box sx={{
          py: 1,

        }}
        >
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
        {filteredTokens.map((token, i) => {
          return (
            <Box key={token.name}
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
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>
                        {token.name}
                      </Typography>
                      <Typography>
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
      </Paper>
    </Container>
  )
}

export default Tokens