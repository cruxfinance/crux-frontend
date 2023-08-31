import React, { FC, useState, useEffect } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  Paper,
  Slide,
  Button,
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import Grid from "@mui/system/Unstable_Grid/Grid";
import Image from "next/image";
import { useRouter } from "next/router";
import { formatNumber, getShortAddress } from "@src/utils/general";
import { timeFromNow } from "@src/utils/daytime";
import { currencies, Currencies } from '@src/utils/currencies';
import { ITokenData } from "@src/pages/tokens";
import Link from "../Link";

export interface ITrade {
  timestamp: Date;
  type: string;
  price: number;
  totalToken: number;
  totalExchange: number;
  wallet: string;
}

export interface PropsType {
  currency: Currencies;
  tokenInfo: ITokenData;
}

const TokenStats: FC<PropsType> = ({ currency, tokenInfo }) => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <>
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
      <Typography sx={{ mb: 2 }}>
        <Link href={`https://explorer.ergoplatform.com/en/token/${tokenInfo.tokenId}`}>
          {getShortAddress(tokenInfo.tokenId)}
        </Link>
      </Typography>
      <Typography sx={{ mb: 2 }}>Description of the token</Typography>
    </>
  );
};

export default TokenStats;




