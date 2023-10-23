import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  useTheme,
  Button,
  Paper,
  useMediaQuery,
  Avatar
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { currencies, Currencies } from '@utils/currencies';
import { formatNumber } from '@utils/general';
import { IReducedToken } from '@pages/portfolio';

type StakedPositionsProps = {
  currency: Currencies;
  exchangeRate: number;
  tokenList: IReducedToken[];
}

const ICON_URL = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/'

const StakedPositions: FC<StakedPositionsProps> = ({ currency, exchangeRate, tokenList }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]
  const stakedTokens = tokenList.filter((item) => item.name.includes('Staked'))

  return (
    <Paper sx={{ py: 3, px: 0, width: '100%', height: '100%', position: 'relative' }}>
      <Box sx={{ px: 2 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Staked Positions
        </Typography>
      </Box>
      <Box sx={{
        py: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(to left, rgba(12, 16, 28, 1), rgba(5, 8, 16, 1))',
        '& .MuiTypography-root': {
          // fontWeight: 600 
        },
        zIndex: 2
      }}
      >
        <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, pl: 2 }}>
          <Typography>
            Symbol
          </Typography>
          <Typography sx={{ display: { xs: 'flex', md: 'none' } }}>
            Qty
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' } }}>
          <Typography>
            Qty
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', }}>
          <Typography>
            Current price
          </Typography>
          <Typography>
            Your cost
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, display: { xs: 'none', sm: 'flex' } }}>
          <Typography>
            Initial trade date
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, flexDirection: 'column' }}>
          <Typography>
            P/L Open
          </Typography>
          <Typography>
            P/L Open (%)
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
          <Typography>
            P/L Day
          </Typography>
          <Typography>
            P/L Day (%)
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
          <Typography>
            P/L YTD
          </Typography>
          <Typography>
            P/L YTD (%)
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, flexDirection: 'column', mr: 2 }}>
          <Typography>
            Total cost
          </Typography>
          <Typography>
            Net liq.
          </Typography>
        </Box>
      </Box>

      {stakedTokens.map((token, i) => {
        return (
          <Box key={token.tokenId}
            sx={{
              py: 1,
              background: i % 2 ? '' : theme.palette.background.paper,
              // userSelect: 'none',
              '&:hover': {
                background: theme.palette.background.hover,
                // cursor: 'pointer'
              },
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center'
            }}
          >
            <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, pl: 2 }}>
              <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              >
                <Box sx={{ mr: 1 }}>
                  <Avatar src={ICON_URL +
                    (
                      token.wrappedTokenIds && (token.wrappedTokenIds as string[]).length > 0
                        ? token.wrappedTokenIds[0]
                        : token.tokenId
                    )
                    + '.svg'} sx={{ width: '24px', height: '24px' }} />
                </Box>
                <Box>
                  <Typography sx={{ textOverflow: 'ellipsis' }}>
                    {token.name.split(' (Staked)')[0]}
                  </Typography>
                </Box>
              </Box>


              <Typography sx={{ display: { xs: 'flex', md: 'none' } }}>
                {formatNumber(token.amount)}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' } }}>
              <Typography>
                {formatNumber(token.amount)}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', }}>
              <Typography>
                {currencySymbol + formatNumber((currency === 'ERG' ? token.value : token.value * exchangeRate))}
              </Typography>
              <Typography>
                - {/* cost per unit */}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, display: { xs: 'none', sm: 'flex' } }}>
              - {/* initial date */}
            </Box>
            <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, flexDirection: 'column' }}>
              <Typography>
                -{/* P/L Open */}
              </Typography>
              <Typography>
                - {/* P/L Open */}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
              <Typography>
                - {/* P/L Day */}
              </Typography>
              <Typography>
                - {/* P/L Day (%) */}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
              <Typography>
                - {/* P/L YTD */}
              </Typography>
              <Typography>
                - {/* P/L YTD (%) */}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '33%', sm: '25%', md: '12.5%' }, flexDirection: 'column', mr: 2 }}>
              <Typography>
                - {/* total cost */}
              </Typography>
              <Typography>
                {currencySymbol + formatNumber((currency === 'ERG' ? token.value : token.value * exchangeRate) * token.amount)}
              </Typography>
            </Box>
          </Box>
        )
      })}




    </Paper>
  );
};

export default StakedPositions;