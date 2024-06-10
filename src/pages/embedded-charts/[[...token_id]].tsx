import React, { FC, useEffect, useState } from 'react';
import {
  Box, Link, Typography, useTheme,
} from '@mui/material';
import {
  LanguageCode,
  ResolutionString,
} from "@lib/charts/charting_library";
import { TVChartContainer } from '@components/charts/AdvancedChart';
import Logo from '@components/svgs/Logo';
import { useRouter } from 'next/router';
import { checkLocalIcon } from '@lib/utils/icons';

const TokenInfo: FC = () => {
  const router = useRouter();
  const { token_id } = router.query
  const tokenId = token_id?.toString()

  const [defaultWidgetProps, setDefaultWidgetProps] = useState({
    symbol: '',
    interval: "1D" as ResolutionString,
    library_path: "/static/charting_library/",
    locale: "en" as LanguageCode,
    fullscreen: false,
    autosize: true,
  })

  const fetchTradeHistory = async (tokenId: string) => {
    try {
      const endpoint = `${process.env.CRUX_API}/crux/token_info/${tokenId}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data: TokenInfoApi = await response.json();

      if (data !== null && data.token_name !== undefined) {
        setDefaultWidgetProps({
          symbol: data.token_name,
          interval: "1D" as ResolutionString,
          library_path: "/static/charting_library/",
          locale: "en",
          fullscreen: false,
          autosize: true,
        })
      }
    } catch (error) {
      console.error('Error fetching token data:', error);
    }
  }

  const theme = useTheme()

  useEffect(() => {
    if (tokenId) {
      fetchTradeHistory(tokenId)
    }
  }, [tokenId])

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        {defaultWidgetProps.symbol &&
          <TVChartContainer defaultWidgetProps={defaultWidgetProps} currency={'ERG'} height="calc(100vh - 50px)" />
        }
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