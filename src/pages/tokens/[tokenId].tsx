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
import { formatNumber } from '@src/utils/general';
import { currencies, Currencies } from '@src/utils/currencies';
import TradeHistory from '@src/components/tokenInfo/TradeHistory';
import TokenStats from '@src/components/tokenInfo/TokenStats';
import dynamic from "next/dynamic";
import Script from "next/script";
import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@utils/charts/charts/charting_library";
import { ITokenData } from '.';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import InfoIcon from '@mui/icons-material/Info';
import HistoryIcon from '@mui/icons-material/History';
import { Link as ScrollLink } from "react-scroll";
import * as Scroll from 'react-scroll';
import { scroller } from 'react-scroll';
import TvChart from '@components/tokenInfo/TvChart';

const Charts: FC = () => {
  const router = useRouter();
  const theme = useTheme()
  const upLg = useMediaQuery(theme.breakpoints.up('lg'))
  const upMd = useMediaQuery(theme.breakpoints.up('md'))
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const tokenId = router.query.tokenId as string;
  const tradingPair = undefined
  const [loading, setLoading] = useState(true)
  const [tokenInfo, setTokenInfo] = useState<ITokenData | null>(null)
  const [currency, setCurrency] = useState<Currencies>('ERG')
  const [exchangeRate, setExchangeRate] = useState(1)
  // const [isScriptReady, setIsScriptReady] = useState(false)
  const [defaultWidgetProps, setDefaultWidgetProps] = useState<Partial<ChartingLibraryWidgetOptions> | undefined>(undefined)
  const [navigation, setNavigation] = useState('stats')

  async function fetchTradeHistory(tokenId: string) {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/spectrum/actions`;
      const payload = {
        limit: 1,
        offset: 0,
        quote_id: tokenId
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const dataArray = await response.json();
      const data = dataArray[0]
      const thisTokenInfo = {
        name: data.quote_token,
        ticker: data.quote_token,
        tokenId: tokenId,
        icon: 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/' + tokenId + '.svg',
        price: data.price_in_ergo,
        pctChange1h: 0,
        pctChange1d: 0,
        pctChange1w: 0,
        pctChange1m: 0,
        vol: 0,
        liquidity: 0,
        buys: 0,
        sells: 0,
        mktCap: 0
      };
      setExchangeRate(data.ergo_price)
      if (thisTokenInfo !== null && thisTokenInfo.name !== undefined) {
        setDefaultWidgetProps({
          symbol: thisTokenInfo.name?.toUpperCase(),
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
      fetchTradeHistory(tokenId)
    }
  }, [tokenId])


  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  return (
    <Container maxWidth={'xl'} id="stats">
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
                maxWidth: upMd ? 'calc(100vw - 370px)' : upSm ? 'calc(100vw - 56px)' : 'calc(100vw - 40px)',
                mb: 2
              }}>
                {defaultWidgetProps !== undefined && (
                  <TvChart defaultWidgetProps={defaultWidgetProps} />
                )}

              </Paper>
              {upLg && (
                <Paper sx={{ p: 2, width: '100%' }} id="history">
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
            <Paper sx={{ p: 2, width: '100%' }} id="history">
              <TradeHistory currency={currency} tokenId={tokenId} tradingPair={tradingPair ? tradingPair : 'ERG'} tokenTicker={tokenInfo.ticker} />
            </Paper>
          )}
        </>
      )}
      {!upSm && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20000 }} elevation={3}>
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
    </Container>
  )
}

export default Charts