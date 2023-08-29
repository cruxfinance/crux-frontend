import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  useTheme
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { currencies, Currencies } from '@utils/currencies';
import { formatNumber } from '@utils/general';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export interface IBalance {
  balance: number;
  currency: Currencies;
  tvl: number;
  apy: number;
  pctChange: number;
}

const Balance: FC<IBalance> = ({ balance, currency, tvl, apy, pctChange }) => {
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
              {pctChange > 0
                ? <ArrowUpwardIcon />
                : pctChange < 0
                && <ArrowDownwardIcon />}
              <Typography>
                {pctChange}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="h4" sx={{ mb: 4 }}>
          {currency} {Number(balance.toFixed(2)).toLocaleString()}
        </Typography>
      </Grid>
      <Grid container xs={12}>
        <Grid xs={6}>
          <Typography>
            TVL
          </Typography>
          <Typography>
            {currencies[currency]}{tvl.toLocaleString()}
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