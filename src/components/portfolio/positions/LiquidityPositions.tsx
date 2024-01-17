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
import { currencies, Currencies } from '@lib/utils/currencies';
import { formatNumber } from '@lib/utils/general';
import { IReducedToken } from '@pages/portfolio';
import { toCamelCase } from '@server/utils/camelCase';
import { trpc } from '@lib/trpc';
import dayjs from 'dayjs';
import GenericTable from '@components/GenericTable';

type LiquidityPositionsProps = {
  currency: Currencies;
  exchangeRate: number;
  addressList: string[];
}

const LiquidityPositions: FC<LiquidityPositionsProps> = ({ currency, exchangeRate, addressList }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]
  const lpPositions = trpc.portfolio.getLpPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const headers = [
    ["Name"],
    ["Price", "Cost"],
    ["Etc"]
  ];

  const data = [
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    { Name: "Item 1", Price: "$100", Cost: "$50", Etc: "Details" },
    // ... other data rows ...
  ];

  return (
    <>
      <Paper sx={{ py: 3, px: 0, width: '100%', height: '100%', position: 'relative' }}>
        <Box sx={{ px: 2 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Liquidity Positions
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

        {lpPositions.isLoading
          ? "Loading..."
          : lpPositions.error
            ? "Error loading"
            : lpPositions.data.map((token, i) => {
              return (
                <Box key={token.quoteTokenId}
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
                        <Avatar
                          src={"icons/tokens/" + token.quoteTokenId + ".svg"}
                          sx={{ width: "24px", height: "24px" }}
                        />
                      </Box>
                      <Box>
                        <Typography sx={{ textOverflow: 'ellipsis' }}>
                          {token.baseTokenName}/{token.quoteTokenName}
                        </Typography>
                      </Box>
                    </Box>


                    <Typography sx={{ display: { xs: 'flex', md: 'none' } }}>
                      {formatNumber(token.baseCurrentAmount)}/{formatNumber(token.quoteCurrentAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' } }}>
                    <Typography>
                      {formatNumber(token.baseProvidedAmount)}/{formatNumber(token.quoteProvidedAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: { xs: '33%', md: '12.5%' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', }}>
                    <Typography>
                      {currencySymbol + formatNumber((currency === 'ERG' ? token.baseCurrentPrice.erg : token.baseCurrentPrice.usd))}
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
                      {currencySymbol + formatNumber((currency === 'ERG' ? token.baseCurrentPrice.erg : token.baseCurrentPrice.usd) * token.baseCurrentAmount)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
      </Paper>

      <GenericTable title="Generic Table" headers={headers} data={data} />

    </>
  );
};

export default LiquidityPositions;