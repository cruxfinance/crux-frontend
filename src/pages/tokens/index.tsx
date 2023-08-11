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
  ToggleButton
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import TokenSort from '@components/tokens/SortBy'
import TokenFilterOptions from '@components/tokens/Filters'
import { formatNumber } from '@src/utils/general';
import { useRouter } from 'next/router';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';

export interface ITokenData {
  name: string;
  ticker: string;
  icon: string;
  price: number;
  pctChange1hr: number;
  pctChange4hr: number;
  pctChange12hr: number;
  pctChange24hr: number;
  vol: number;
  liquidity: number;
  buys: number;
  sells: number;
  mktCap: number;
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
  sortBy?: string;
  sortOrder?: 'dec' | 'asc';
}

export interface IQueries {
  limit?: number;
  offset?: number;
}

export interface ITimeframe {
  selectedPeriod?: '1hr' | '4hr' | '12hr' | '24hr';
}

const Tokens: FC = () => {
  const theme = useTheme()
  const router = useRouter()
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const [loading, setLoading] = useState(false)
  const [filteredTokens, setFilteredTokens] = useState<ITokenData[]>([])
  const [filters, setFilters] = useState<IFilters>({})
  const [sorting, setSorting] = useState<ISorting>({ sortBy: 'vol', sortOrder: 'dec' })
  const [queries, setQueries] = useState<IQueries>({ limit: 20, offset: 0 });
  const [timeframe, setTimeframe] = useState<ITimeframe>({ selectedPeriod: '24hr' });
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeframe: '1hr' | '4hr' | '12hr' | '24hr',
  ) => {
    if (newTimeframe !== null) setTimeframe({ selectedPeriod: newTimeframe });
  };

  async function fetchTokenData(
    filters: IFilters,
    sorting: ISorting,
    queries: IQueries,
    timeframe: ITimeframe
  ) {
    setLoading(true)
    try {
      const combinedParams = { ...filters, ...sorting, ...queries, ...timeframe };
      const queryString = Object.entries(combinedParams)
        .reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
          }
          return acc;
        }, [] as string[])
        .join('&')
      console.log(queryString)
      const response = await fetch(`/api/mocks/tokens?${queryString}`);
      const data = await response.json();
      setFilteredTokens(data);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTokenData(filters, sorting, queries, timeframe);
  }, [filters, sorting, queries, timeframe]);

  const numberFilters = Math.round(Object.keys(filters).length / 2)

  const formatPercent = (pct: number) => {
    return (
      <Typography
        sx={{
          color: pct < 0 ? 'red' : pct > 0 ? 'green' : theme.palette.text.secondary
        }}
      >
        {formatNumber(pct * 0.01, 2, true)}%
      </Typography>
    )
  }

  return (
    <Container>
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
            <ToggleButton value="1hr">
              1h
            </ToggleButton>
            <ToggleButton value="4hr">
              4h
            </ToggleButton>
            <ToggleButton value="12hr">
              12h
            </ToggleButton>
            <ToggleButton value="24hr">
              24h
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


      <TokenFilterOptions filters={filters} setFilters={setFilters} open={filterModalOpen} setOpen={setFilterModalOpen} />


      <Paper>
        <Box sx={{
          py: 1,

        }}
        >
          <Grid container spacing={1} alignItems="center">
            <Grid xs={3}>
              Token
            </Grid>
            <Grid xs={2}>
              Price
            </Grid>
            <Grid xs={1}>
              1h
            </Grid>
            <Grid xs={1}>
              4h
            </Grid>
            <Grid xs={1}>
              12h
            </Grid>
            <Grid xs={1}>
              24h
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
                router.push(`/tokens/${token.ticker.toLowerCase()}`)
              }}
            >
              <Grid container spacing={1} alignItems="center">
                <Grid xs={1}>
                  {token.icon}
                </Grid>
                <Grid xs={2}>
                  <Typography>
                    {token.name}
                  </Typography>
                  <Typography>
                    {token.ticker.toUpperCase()}
                  </Typography>
                </Grid>
                <Grid xs={2}>
                  ${token.price}
                </Grid>
                <Grid xs={1}>
                  {formatPercent(token.pctChange1hr)}
                </Grid>
                <Grid xs={1}>
                  {formatPercent(token.pctChange4hr)}
                </Grid>
                <Grid xs={1}>
                  {formatPercent(token.pctChange12hr)}
                </Grid>
                <Grid xs={1}>
                  {formatPercent(token.pctChange24hr)}
                </Grid>
                <Grid xs={1}>
                  <Typography>
                    V ${formatNumber(token.vol)}
                  </Typography>
                  <Typography>
                    L ${formatNumber(token.liquidity)}
                  </Typography>
                </Grid>
                <Grid xs={1}>
                  <Typography>
                    T {token.buys + token.sells}
                  </Typography>
                  <Typography>
                    M ${formatNumber(token.mktCap)}
                  </Typography>
                </Grid>
                <Grid xs={1}>
                  <Typography sx={{ color: 'green' }}>
                    B {token.buys}
                  </Typography>
                  <Typography sx={{ color: 'red' }}>
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