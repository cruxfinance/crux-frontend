import { FC, useState, useEffect } from 'react';
import {
  Container,
  Button,
  Typography,
  Box,
  Paper,
  // useTheme,
  // useMediaQuery,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import CandleStickChart from '@src/components/charts/CandleStickChart';
import Grid from '@mui/system/Unstable_Grid/Grid';
import { useRouter } from 'next/router';
import { formatNumber } from '@src/utils/general';
import { currencies } from '@src/utils/currencies';

const Charts: FC = () => {
  const router = useRouter();
  const tokenTicker = router.query.token;
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<any>({})
  const [currency, setCurrency] = useState<'USD' | 'ERG'>('USD')

  async function fetchTokenData(ticker: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/mocks/tokens/${ticker}?currency=${currency}`);
      const data = await response.json();
      console.log(data)
      setTokenInfo(data);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenTicker) {
      fetchTokenData(tokenTicker.toString())
    }
  }, [tokenTicker, currency])

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
          <Typography variant="h6" sx={{ lineHeight: 1 }}>{tokenInfo.ticker}/{currency}</Typography>
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


      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <Paper sx={{ p: 2, width: '100%', maxWidth: 'calc(100vw - 370px)', mb: 2 }}>
            <CandleStickChart currency={currency} />
          </Paper>
          <Paper sx={{ p: 2, width: '100%' }}>
            <Typography>List of market buys and sells</Typography>
          </Paper>
        </Box>
        <Box sx={{ display: 'flex', flex: '0 0 300px' }}>
          <Paper sx={{ p: 2, width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Grid container justifyContent="space-between">
                <Grid>Liquidity: </Grid>
                <Grid>{currencies[currency] + formatNumber(tokenInfo.liquidity)}</Grid>
              </Grid>
              <Grid container justifyContent="space-between">
                <Grid>24hr Volume: </Grid>
                <Grid>{currencies[currency] + formatNumber(tokenInfo.vol)}</Grid>
              </Grid>
              <Grid container justifyContent="space-between">
                <Grid>Mkt Cap: </Grid>
                <Grid>{currencies[currency] + formatNumber(tokenInfo.mktCap)}</Grid>
              </Grid>
              <Grid container justifyContent="space-between">
                <Grid>Total supply: </Grid>
                <Grid></Grid>
              </Grid>
              <Grid container justifyContent="space-between">
                <Grid>Circultating supply: </Grid>
                <Grid></Grid>
              </Grid>
              <Grid container justifyContent="space-between">
                <Grid>TVL: </Grid>
                <Grid></Grid>
              </Grid>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button variant="contained" sx={{ mr: 2 }}>Add to watchlist</Button>
              <Button variant="outlined">Trade</Button>
            </Box>
            <Typography sx={{ mb: 2 }}>Links to token website and socials</Typography>
            <Typography sx={{ mb: 2 }}>TokenID with explorer link</Typography>
            <Typography sx={{ mb: 2 }}>Description of the token</Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}

export default Charts