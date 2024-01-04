import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
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
  BottomNavigationAction
} from '@mui/material';
import Grid from '@mui/system/Unstable_Grid/Grid';
import { useRouter } from 'next/router';
import { formatNumber } from '@lib/utils/general';
import { currencies, Currencies } from '@lib/utils/currencies';
import TradeHistory from '@components/tokenInfo/TradeHistory';
import TokenStats from '@components/tokenInfo/TokenStats';
import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@lib/charts/charting_library";
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import InfoIcon from '@mui/icons-material/Info';
import HistoryIcon from '@mui/icons-material/History';
import { scroller } from 'react-scroll';
import TvChart from '@components/tokenInfo/TvChart';

type TokenInfoApi = {
  token_id: string;
  token_name: string;
  token_description: string;
  decimals: number;
  minted: number;
  value_in_erg: number;
  locked_supply: number;
  liquid_supply: number;
  burned_supply: number;
};

export interface TokenDataPlus extends ITokenData {
  totalMinted: number;
  lockedSupply: number;
  liquidSupply: number;
  burnedSupply: number;
  description: string;
}

const TokenInfo: FC = () => {
  const router = useRouter();
  const theme = useTheme()
  const upLg = useMediaQuery(theme.breakpoints.up('lg'))
  const upMd = useMediaQuery(theme.breakpoints.up('md'))
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const tokenId = router.query.tokenId as string;
  const tradingPair = undefined
  const [loading, setLoading] = useState(true)
  const [tokenInfo, setTokenInfo] = useState<TokenDataPlus | null>(null)
  const [currency, setCurrency] = useState<Currencies>('ERG')
  const [exchangeRate, setExchangeRate] = useState(1)
  // const [isScriptReady, setIsScriptReady] = useState(false)
  const [defaultWidgetProps, setDefaultWidgetProps] = useState<Partial<ChartingLibraryWidgetOptions> | undefined>(undefined)
  const [navigation, setNavigation] = useState('stats')

  const getExchangeRate = async () => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/coingecko/erg_price`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      if (data.price) setExchangeRate(data.price)
      else throw new Error("Unable to fetch Ergo price data")
    } catch (error) {
      console.error("Error fetching Ergo price data:", error);
    } finally {
      setLoading(false);
    }
  }

  const fetchTradeHistory = async (tokenId: string) => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/crux/token_info/${tokenId}`;
      // const payload = {
      //   token_id: tokenId
      // };
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // body: JSON.stringify(payload)
      });

      const data: TokenInfoApi = await response.json();
      const thisTokenInfo = {
        name: data.token_name,
        ticker: data.token_name,
        tokenId: tokenId,
        icon: 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/' + tokenId + '.svg',
        price: data.value_in_erg,
        pctChange1h: 0,
        pctChange1d: 0,
        pctChange1w: 0,
        pctChange1m: 0,
        vol: 0,
        liquidity: 0,
        buys: 0,
        sells: 0,
        mktCap: (data.minted - data.burned_supply) * (currency === 'ERG' ? data.value_in_erg : data.value_in_erg * exchangeRate),
        totalMinted: data.minted,
        lockedSupply: data.locked_supply,
        liquidSupply: data.liquid_supply,
        burnedSupply: data.burned_supply,
        description: data.token_description
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
        })
      }
      setTokenInfo(thisTokenInfo);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenId) {
      getExchangeRate()
      fetchTradeHistory(tokenId)
    }
  }, [tokenId])

  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
      setTokenInfo(prev => {
        if (prev) return {
          ...prev,
          mktCap: (prev.totalMinted - prev.burnedSupply) * (value === 'ERG' ? prev.price : prev.price * exchangeRate)
        }
        else return null
      })
    }
  };

  return (
    <Box id="stats" sx={{ mx: 2 }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: loading ? '1' : '0',
          width: '100vw',
          height: '100vh',
          background: 'rgba(24,28,33,1)',
          zIndex: 999,
          color: '#fff',
          transition: 'opacity 500ms',
          pointerEvents: loading ? 'auto' : 'none'
        }}
      >
        <CircularProgress color="inherit" sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }} />
      </Box>
      {!loading && tokenInfo && (
        <>
          <Grid container justifyContent="space-between" alignItems="flex-end" sx={{ mb: 2 }}>
            <Grid>
              <Typography variant="h2" sx={{ lineHeight: 1, mb: 2 }}>{tokenInfo.name}</Typography>
              <Typography variant="h6" sx={{ lineHeight: 1 }}>{tokenInfo.ticker}/{tradingPair ? tradingPair : 'ERG'}</Typography>
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
              <Typography variant="h4">
                {currencies[currency]}{currency === 'USD' ? formatNumber(tokenInfo.price * exchangeRate, 4) : formatNumber(tokenInfo.price, 4)}
              </Typography>
            </Grid>
          </Grid>

          {!upMd && (
            <Box sx={{ display: 'flex', flex: '0 0 300px', mb: 2 }}>
              <Paper sx={{ p: 2, width: '100%' }}>
                <TokenStats currency={currency} tokenInfo={tokenInfo} />
              </Paper>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }} id="chart">
              <Paper sx={{
                p: 2,
                width: '100%',
                maxWidth: upMd ? 'calc(100vw - 354px)' : upSm ? 'calc(100vw - 56px)' : 'calc(100vw - 40px)',
                mb: 2,
                position: 'relative'
              }}>
                {defaultWidgetProps !== undefined && (
                  <TvChart defaultWidgetProps={defaultWidgetProps} />
                )}

              </Paper>
              {upLg && (
                <Paper sx={{ p: 2, width: '100%', position: 'relative' }} id="history">
                  <TradeHistory currency={currency} tokenId={tokenId} tradingPair={tradingPair ? tradingPair : 'ERG'} tokenTicker={tokenInfo.ticker} />
                </Paper>
              )}
            </Box>
            {upMd && (
              <Box sx={{ display: 'flex', flex: '0 0 300px', mb: 2 }}>
                <Box sx={{ width: '100%', }}>
                  <Paper sx={{ p: 2, width: '100%', position: 'sticky', top: '16px', height: { md: '100%', lg: 'calc(100vh - 32px)' }, maxHeight: '100%', mb: { md: 0, lg: -2 } }}>
                    <TokenStats currency={currency} tokenInfo={tokenInfo} />
                  </Paper>
                </Box>
              </Box>
            )}
          </Box>
          {!upLg && (
            <Paper sx={{ p: 2, width: '100%', position: 'relative' }} id="history">
              <TradeHistory currency={currency} tokenId={tokenId} tradingPair={tradingPair ? tradingPair : 'ERG'} tokenTicker={tokenInfo.ticker} />
            </Paper>
          )}
        </>
      )}
      {!upSm && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 11500 }} elevation={3}>
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
              onClick={() => scroller.scrollTo("stats", { duration: 500, offset: -50, smooth: true })}
            />
            <BottomNavigationAction
              label="Chart"
              icon={<CandlestickChartIcon />}
              onClick={() => scroller.scrollTo("chart", { duration: 500, offset: -50, smooth: true })}
            />
            <BottomNavigationAction
              label="Trade History"
              icon={<HistoryIcon />}
              onClick={() => scroller.scrollTo("history", { duration: 500, offset: -50, smooth: true })}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}

export default TokenInfo