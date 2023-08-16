import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';

interface IBalance {

}

const Balance: FC<IBalance> = ({ }) => {
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
            4.5%
          </Grid>
        </Grid>

        <Typography variant="h4" sx={{ mb: 4 }}>
          USD 16,093.23
        </Typography>
      </Grid>
      <Grid container xs={12}>
        <Grid xs={6}>
          <Typography>
            TVL
          </Typography>
          <Typography>
            USD 9,354.23
          </Typography>
        </Grid>
        <Grid xs={6}>
          <Typography>
            Estimated APY
          </Typography>
          <Typography>
            42%
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Balance;