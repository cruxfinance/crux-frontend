import { FC, useState, useEffect } from 'react';
import {
  Container,
  Button,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton
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
} from "@src/submodules/charts/charting_library";

const defaultWidgetProps: Partial<ChartingLibraryWidgetOptions> = {
  symbol: "ERGOPAD",
  interval: "D" as ResolutionString,
  library_path: "/static/charting_library/",
  locale: "en",
  charts_storage_url: "https://saveload.tradingview.com",
  charts_storage_api_version: "1.1",
  client_id: "tradingview.com",
  user_id: "public_user_id",
  fullscreen: false,
  autosize: true,
};

const TVChartContainer = dynamic(
  () =>
    import("@components/charts/AdvancedChart").then((mod) => mod.TVChartContainer),
  { ssr: false }
);

const Charts: FC = () => {
  const router = useRouter();
  const theme = useTheme()
  const upLg = useMediaQuery(theme.breakpoints.up('lg'))
  const upMd = useMediaQuery(theme.breakpoints.up('md'))
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const tokenId = router.query.tokenId as string;
  const tradingPair = router.query.tradingPair as string;
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<any>({})
  const [currency, setCurrency] = useState<Currencies>('USD')

  // tradingview chart script
  const [isScriptReady, setIsScriptReady] = useState(false);

  async function fetchTokenData(tokenId: string) {
    setLoading(true)
    try {
      const query = `/api/mocks/tokens/${tokenId}?currency=${currency}${tradingPair ? `&tradingPair=${tradingPair}` : ''}`
      const response = await fetch(query);
      const data = await response.json();
      console.log(query)
      setTokenInfo(data);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenId) {
      fetchTokenData(tokenId)
    }
  }, [tokenId, currency])


  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  return (
    <Container maxWidth={false}>
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
            {currencies[currency] + formatNumber(tokenInfo.price, 6)}
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
      <Box sx={{ display: 'flex', gap: 2, alignItems: upLg ? 'flex-start' : 'stretch' }}>
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <Paper sx={{
            p: 2,
            width: '100%',
            maxWidth: upMd ? 'calc(100vw - 370px)' : upSm ? 'calc(100vw - 56px)' : 'calc(100vw - 40px)',
            mb: 2
          }}>
            <Script
              src="/static/datafeeds/udf/dist/bundle.js"
              strategy="lazyOnload"
              onReady={() => {
                setIsScriptReady(true);
              }}
            />
            {isScriptReady && <TVChartContainer {...defaultWidgetProps} />}
          </Paper>
          {upLg && (
            <Paper sx={{ p: 2, width: '100%' }}>
              <TradeHistory currency={currency} tokenId={tokenId} tradingPair={tradingPair ? tradingPair : 'ERG'} tokenTicker={tokenInfo.ticker} />
            </Paper>
          )}
        </Box>
        {upMd && (
          <Box sx={{ display: 'flex', flex: '0 0 300px', mb: 2 }}>
            <Paper sx={{ p: 2, width: '100%' }}>
              <TokenStats currency={currency} tokenInfo={tokenInfo} />
            </Paper>
          </Box>
        )}
      </Box>
      {!upLg && (
        <Paper sx={{ p: 2, width: '100%' }}>
          <TradeHistory currency={currency} tokenId={tokenId} tradingPair={tradingPair ? tradingPair : 'ERG'} tokenTicker={tokenInfo.ticker} />
        </Paper>
      )}
    </Container>
  )
}

export default Charts