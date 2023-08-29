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
import { IReducedToken } from '@src/pages/portfolio';
import { generateGradient } from '@src/utils/color';
import { formatNumber, adjustDecimals } from '@src/utils/general';

export type IActiveToken = {
  name: string;
  amount: number;
  value: number;
  color: string;
} | null

interface ITokenSummary {
  tokenList: IReducedToken[];
  totalValue: number;
  currency: Currencies;
  boxHeight: string;
  setBoxHeight: React.Dispatch<React.SetStateAction<string>>
  setLoading: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
}

const ICON_URL = 'https://raw.githubusercontent.com/spectrum-finance/token-logos/db79f78637ad36826f4bd6cb10ccf30faf883fc7/logos/ergo/'

const TokenSummary: FC<ITokenSummary> = ({ tokenList, currency, boxHeight, setBoxHeight, setLoading, totalValue }) => {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [reducedTokensList, setReducedTokensList] = useState<IPieToken[]>([])
  const [colors, setColors] = useState<string[]>([])
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

  useEffect(() => {
    // remove any tokens that aren't at least 1% of the portfolio value, for the pie chart
    const filteredTokens = tokenList.filter(token => {
      return token.amount * token.value > totalValue * 0.01
    })
    setReducedTokensList(filteredTokens)

    setColors(generateGradient(filteredTokens.length))
  }, [tokenList])

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

      <Grid container spacing={4} direction={{ xs: 'column', md: 'row' }}>
        <Grid>
          <Box ref={pieChartRef} sx={{ textAlign: 'center' }}>
            <PieChart
              totalValue={totalValue}
              tokens={reducedTokensList}
              currency={currency}
              colors={colors}
              activeSymbol={activeSymbol}
              setActiveSymbol={setActiveSymbol}
            />
          </Box>
        </Grid>
        <Grid xs>
          <Box sx={{ overflowY: 'auto', height: boxHeight, mr: -2, pr: 2 }}>
            {tokenList.map((item, i) => {
              const thisActive = item.name === activeSymbol
              return (
                <Box
                  onMouseEnter={() => setActiveSymbol(item.name)}
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
                    <Avatar src={ICON_URL +
                      (
                        item.wrappedTokenIds && (item.wrappedTokenIds as string[]).length > 0
                          ? item.wrappedTokenIds[0]
                          : item.tokenId
                      )
                      + '.svg'} sx={{ width: '24px', height: '24px' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{
                      fontWeight: 700,
                      color: thisActive && colors[i] !== undefined ? colors[i] : theme.palette.text.primary
                    }}>
                      {item.name}
                    </Typography>
                    <Typography
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {item.name.slice(0, 4).toUpperCase()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '16px !important', fontWeight: 700 }}>
                      {formatNumber(item.amount)} ({currencySymbol + formatNumber(item.value * item.amount)})
                    </Typography>
                    {item.pctChange && (
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
                    )}
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