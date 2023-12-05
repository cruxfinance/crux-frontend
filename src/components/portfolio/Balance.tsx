import React, { FC } from 'react';
import {
  Typography,
  Container,
  Box,
  useTheme,
  Button
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { currencies, Currencies } from '@lib/utils/currencies';

export interface IBalance {
  balance: number;
  currency: Currencies;
  tvl: number;
  apy: number;
  pctChange: number;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
  exchangeRate: number;
}

const Balance: FC<IBalance> = ({ balance, currency, tvl, apy, pctChange, exchangeRate, setCurrency }) => {
  const theme = useTheme()
  return (
    <Grid container spacing={2} alignItems="space-between" sx={{ height: '100%' }}>
      <Grid xs={12}>
        <Grid container alignItems="center" sx={{ mb: 2 }}>
          <Grid xs>
            <Typography variant="h6">
              Balance
            </Typography>
          </Grid>
          <Grid>
            <Box
              sx={{
                color: pctChange > 0
                  ? theme.palette.up.main
                  : pctChange < 0
                    ? theme.palette.down.main
                    : '#9475d8',
                flexDirection: 'row',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {/* {pctChange > 0
                ? <ArrowUpwardIcon />
                : pctChange < 0
                && <ArrowDownwardIcon />}
              <Typography>
                {pctChange}%
              </Typography> */}
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 4 }}>
          <Typography variant="h4">
            {currencies[currency]}{Number((currency === 'ERG' ? balance : balance * exchangeRate).toFixed(2)).toLocaleString()}
          </Typography>
          <Button variant="outlined" onClick={() => { setCurrency(currency === 'ERG' ? 'USD' : 'ERG') }}>
            {currency}
          </Button>
        </Box>
      </Grid>
      <Grid container xs={12}>
        <Grid xs={6}>
          <Typography>
            TVL
          </Typography>
          <Typography>
            {currencies[currency]}{Number((currency === 'ERG' ? tvl : tvl * exchangeRate).toFixed(2)).toLocaleString()}
          </Typography>
        </Grid>
        <Grid xs={6}>
          <Typography>
            Estimated APY
          </Typography>
          <Typography>
            {apy !== 0 ? apy : '-'}%
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Balance;