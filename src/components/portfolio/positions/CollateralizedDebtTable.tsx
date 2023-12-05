import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  useTheme,
  Button,
  Paper,
  useMediaQuery
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { currencies, Currencies } from '@lib/utils/currencies';
import { formatNumber } from '@lib/utils/general';
import { IReducedToken } from '@pages/portfolio';

type CollateralizedDebtTableProps = {
  currency: Currencies;
  exchangeRate: number;
  tokenList: IReducedToken[];
}

const CollateralizedDebtTable: FC<CollateralizedDebtTableProps> = ({ currency, exchangeRate, tokenList }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]

  return (
    <Paper sx={{ py: 3, px: 0, width: '100%', height: '100%', position: 'relative' }}>
      <Box sx={{ px: 2 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Collateralized Debt
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
        }
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
            Last traded price
          </Typography>
          <Typography>
            Your cost per unit
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


      {tokenList.map((token, i) => {
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
              <Typography>
                {token.name}
              </Typography>
              <Typography sx={{ display: { xs: 'flex', md: 'none' } }}>
                {token.amount}
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

export default CollateralizedDebtTable;