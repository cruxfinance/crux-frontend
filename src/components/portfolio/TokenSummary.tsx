import React, { FC, useState, useEffect, useRef } from 'react';
import {
  Typography,
  Container,
  Box,
  Avatar,
  useTheme
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { PieChart, IPieToken } from '@src/components/charts/PieChart';
import { currencies, Currencies } from '@src/utils/currencies';
import { IExtendedToken } from '@src/pages/portfolio';
import { generateGradient } from '@src/utils/color';
import { formatNumber } from '@src/utils/general';

export type IActiveToken = {
  symbol: string;
  amount: number;
  value: number;
  color: string;
} | null

interface ITokenSummary {
  tokenList: IExtendedToken[];
  currency: Currencies;
  boxHeight: string;
  setBoxHeight: React.Dispatch<React.SetStateAction<string>>
  setLoading: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
}

const ICON_URL = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/'

const TokenSummary: FC<ITokenSummary> = ({ tokenList, currency, boxHeight, setBoxHeight, setLoading }) => {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const theme = useTheme()
  const pieChartRef = useRef<HTMLElement | null>(null);
  const currencySymbol = currencies[currency]

  useEffect(() => {
    if (pieChartRef.current) {
      const height = pieChartRef.current.offsetHeight;
      setBoxHeight(`${height}px`);
      setLoading(prev => {
        return {
          ...prev,
          tokenSummary: false
        }
      })
    }
  }, [pieChartRef]);

  const colors = generateGradient(tokenList.length)

  return (
    <>
      <Grid container alignItems="center" sx={{ mb: 2 }}>
        <Grid xs>
          <Typography variant="h6">
            Wallet Summary
          </Typography>
        </Grid>
        <Grid>
          {tokenList.length + ' '} Currencies
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid>
          <Box ref={pieChartRef}>
            <PieChart tokens={tokenList} currency={currency} colors={colors} activeSymbol={activeSymbol} setActiveSymbol={setActiveSymbol} />
          </Box>
        </Grid>
        <Grid xs>
          <Box sx={{ overflowY: 'auto', height: boxHeight, mr: -2, pr: 2 }}>
            {tokenList.map((item, i) => {
              const thisActive = item.symbol === activeSymbol
              return (
                <Box
                  onMouseEnter={() => setActiveSymbol(item.symbol)}
                  onMouseLeave={() => setActiveSymbol(null)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 1,
                    // mb: 2,
                    p: 1,
                    borderRadius: '8px',
                    background: thisActive ? theme.palette.background.paper : 'none'
                  }}
                  key={i + ':' + item.tokenId}
                >
                  <Box sx={{ pt: '2px' }}>
                    <Avatar src={ICON_URL + item.tokenId + '.svg'} sx={{ width: '24px', height: '24px' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{
                      fontWeight: 700,
                      color: thisActive ? colors[i] : theme.palette.text.primary
                    }}>
                      {item.symbol}
                    </Typography>
                    <Typography
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '16px !important', fontWeight: 700 }}>
                      {formatNumber(item.amount)} ({currencySymbol + formatNumber(item.value * item.amount)})
                    </Typography>
                    <Typography sx={{ fontSize: '16px !important', fontWeight: 700 }}>
                      <Typography
                        component="span"
                        sx={{
                          color: item.pctChange < 0
                            ? theme.palette.down.main
                            : item.pctChange > 0
                              ? theme.palette.up.main
                              : theme.palette.text.secondary,
                          fontSize: '14px !important'
                        }}>
                        {(item.pctChange * 0.01).toFixed(2)}%
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default TokenSummary;