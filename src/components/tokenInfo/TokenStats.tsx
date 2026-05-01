import React, { FC } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  Button,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { formatNumber, formatFullNumber, getShortAddress } from "@lib/utils/general";
import { currencies, Currencies } from '@lib/utils/currencies';
import { TokenDataPlus } from "@pages/tokens/[tokenId]";
import Link from "../Link";

export interface PropsType {
  currency: Currencies;
  tokenInfo: TokenDataPlus;
}

const TokenStats: FC<PropsType> = ({ currency, tokenInfo }) => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  return (
    <>
      <Typography sx={{ mb: 2, overflowWrap: 'anywhere' }}>{tokenInfo.description}</Typography>
      <Typography sx={{ mb: 2 }}>
        <Link href={`https://explorer.ergoplatform.com/en/token/${tokenInfo.tokenId}`}>
          {getShortAddress(tokenInfo.tokenId)}
        </Link>
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Grid container justifyContent="space-between">
          <Grid>Minted: </Grid>
          <Grid>{formatFullNumber(tokenInfo.totalMinted)}</Grid>
        </Grid>
        {tokenInfo.burnedSupply > 0 && (
          <>
            <Grid container justifyContent="space-between">
              <Grid>Burned: </Grid>
              <Grid>{formatFullNumber(tokenInfo.burnedSupply)}</Grid>
            </Grid>
            <Grid container justifyContent="space-between">
              <Grid>Current: </Grid>
              <Grid>{formatFullNumber(tokenInfo.totalMinted - tokenInfo.burnedSupply)}</Grid>
            </Grid>
          </>
        )}
        <Grid container justifyContent="space-between">
          <Grid>Liquid supply: </Grid>
          <Grid>{formatFullNumber(tokenInfo.liquidSupply)}</Grid>
        </Grid>
        <Grid container justifyContent="space-between">
          <Grid>TVL: </Grid>
          <Grid>{formatFullNumber(tokenInfo.lockedSupply)}</Grid>
        </Grid>
        <Grid container justifyContent="space-between">
          <Grid>Diluted market cap: </Grid>
          <Grid>{currencies[currency] + formatFullNumber(tokenInfo.mktCap)}</Grid>
        </Grid>
        {/* <Grid container justifyContent="space-between">
          <Grid>Liquidity: </Grid>
          <Grid>{currencies[currency] + formatNumber(tokenInfo.liquidity)}</Grid>
        </Grid>
        <Grid container justifyContent="space-between">
          <Grid>24hr Volume: </Grid>
          <Grid>{currencies[currency] + formatNumber(tokenInfo.vol)}</Grid>
        </Grid> */}
      </Box>
      {/* <Box sx={{ mb: 2 }}>
        <Button variant="contained" sx={{ mr: 2 }}>Add to watchlist</Button>
        <Button variant="outlined">Trade</Button>
      </Box>
      <Typography sx={{ mb: 2 }}>Links to token website and socials</Typography> */}

    </>
  );
};

export default TokenStats;




