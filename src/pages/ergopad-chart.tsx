import React, { FC } from 'react';
import {
  Box, Link, Typography, useTheme,
} from '@mui/material';
import {
  LanguageCode,
  ResolutionString,
} from "@lib/charts/charting_library";
import { TVChartContainer } from '@components/charts/AdvancedChart';
import Logo from '@components/svgs/Logo';

const TokenInfo: FC = () => {
  const theme = useTheme()
  const defaultWidgetProps = {
    symbol: 'ergopad',
    interval: "1D" as ResolutionString,
    library_path: "/static/charting_library/",
    locale: "en" as LanguageCode,
    // charts_storage_url: "https://saveload.tradingview.com",
    // charts_storage_api_version: "1.1",
    // client_id: "tradingview.com",
    // user_id: "public_user_id",
    fullscreen: false,
    autosize: true,
  }

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <TVChartContainer defaultWidgetProps={defaultWidgetProps} currency={'ERG'} height="calc(100vh - 50px)" />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{
          mr: 1,
          transform: 'translateY(1px)'
        }}>Powered by</Typography>
        <Box>
          <Link
            href="https://cruxfinance.io"
            target="_blank"
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              '&:hover': {
                '& span': {
                  color: theme.palette.primary.main
                },
                '& .MuiSvgIcon-root': {
                  color: theme.palette.primary.main
                }
              }
            }}
          >
            <Logo
              sx={{
                mr: '3px',
                fontSize: '24px',
                color: theme.palette.text.primary,
              }}
            />
            <Typography
              component="span"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '1.2rem!important',
                fontWeight: '700',
                fontFamily: '"Jura", sans-serif',
              }}
            >
              Crux Finance
            </Typography>
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

export default TokenInfo