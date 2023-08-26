import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { currencies, Currencies } from '@utils/currencies';
import { formatNumber } from '@utils/general';


export interface IBalance {
  balance: number;
  currency: Currencies;
  tvl: number;
  apy: number;
  pctChange: number;
}

const Balance: FC<IBalance> = ({ balance, currency, tvl, apy, pctChange }) => {
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
            {pctChange}%
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
            {currencies[currency]}{formatNumber(tvl, 2, true)}
          </Typography>
        </Grid>
        <Grid xs={6}>
          <Typography>
            Estimated APY
          </Typography>
          <Typography>
            {apy}%
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Balance;