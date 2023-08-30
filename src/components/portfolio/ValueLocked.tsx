import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  useTheme,
  Box
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import StackedBar from '@components/charts/StackedBar';
import { Currencies } from '@utils/currencies';
import { IReducedToken } from '@pages/portfolio';

export interface ITvl {
  value: number;
  totalTokens: number;
  earnedTokens?: number;
  redeemedTokens?: number;
  name: string;
  type: string;
  issuer: string;
  apyPct?: number; // 100 = 1.00%
}

interface IValueLocked {
  currency: Currencies;
  exchangeRate: number;
  tokenList: IReducedToken[];
}

const ValueLocked: FC<IValueLocked> = ({ currency, exchangeRate, tokenList }) => {
  const theme = useTheme()
  const [longestBarValue, setLongestBarValue] = useState(0)
  const [reducedTvlList, setReducedTvlList] = useState<ITvl[]>([])

  useEffect(() => {
    const wrappedTokenList = tokenList.filter((item) => item.wrappedTokenIds?.length !== undefined && item.wrappedTokenIds?.length > 0)
    const reducedTokens = wrappedTokenList.map((item) => {
      const rest = item.name.includes('(Staked)')
        ? { type: '(Staked)', issuer: 'Ergopad', name: item.name.split(' ')[0] }
        : item.name.includes('(Vested)')
          ? { type: '(Vested)', issuer: 'Ergopad', name: item.name.split(' ')[0] }
          : item.name.includes('Spectrum YF')
            ? { type: '(YF)', issuer: 'Spectrum', name: item.name.split(' ')[0] }
            : item.name.includes('Lend Token')
              ? { type: '(Loan)', issuer: 'Duckpools', name: item.name.split(' ')[0] }
              : { type: '', issuer: '', name: item.name }
      return {
        value: item.value,
        totalTokens: item.amount,
        earnedTokens: item.description?.includes('originalAmountStaked')
          ? item.amount - JSON.parse(item.description).originalAmountStaked
          : item.description?.includes('Total vested')
            ? item.amount - JSON.parse(item.description)['Total vested']
            : undefined,
        ...rest
      }
    })
    setReducedTvlList(reducedTokens)
  }, [tokenList])

  useEffect(() => {
    if (reducedTvlList.length > 0) {
      const maxLength = reducedTvlList.reduce((max, item) => {
        const currentItemLength = item.value * (item.totalTokens);
        return currentItemLength > max ? currentItemLength : max;
      }, 0);

      setLongestBarValue(maxLength);
    }
  }, [reducedTvlList]);

  return (
    <Box>
      <Grid container alignItems="center" sx={{ mb: 2 }}>
        <Grid xs>
          <Typography variant="h6">
            Locked Value Summary
          </Typography>
        </Grid>
        <Grid>

        </Grid>
      </Grid>
      {reducedTvlList.map((item, i) => {
        return (
          <Box key={`${i}-${item.name}-${item.type}`} sx={{ mb: 1 }}>
            <Grid container justifyContent="space-between" alignItems="flex-end" spacing={3}>
              <Grid>
                <Typography sx={{ fontSize: '15px !important', fontWeight: 600 }}>
                  {item.name}, {item.type}
                </Typography>
              </Grid>
              <Grid xs>
                <Typography color="text.secondary" sx={{ fontSize: '14px !important', textAlign: 'right', overflow: 'hidden' }}>
                  {item.issuer}
                </Typography>
              </Grid>
            </Grid>

            <StackedBar {...item} currency={currency} longestBar={longestBarValue} exchangeRate={exchangeRate} />

          </Box>
        )
      })}
    </Box>
  );
};

export default ValueLocked;

// const apiTvlList: ITvl[] = [
//   {
//     value: 0.0052,
//     totalTokens: 1620093.21,
//     earnedTokens: 847000.43,
//     redeemedTokens: 12483,
//     name: 'Ergopad',
//     type: 'Staked',
//     issuer: 'Ergopad',
//     apyPct: 5904
//   },
//   {
//     value: 0.0034,
//     totalTokens: 4210932,
//     earnedTokens: 450000,
//     redeemedTokens: 0,
//     name: 'PAI/Erg LP',
//     type: 'Yield Farm',
//     issuer: 'Spectrum Finance',
//     apyPct: 1123
//   },
//   {
//     value: 0.012,
//     totalTokens: 220000,
//     redeemedTokens: 112511,
//     name: 'EPOS',
//     type: 'Vested',
//     issuer: 'Ergopad',
//   },
//   {
//     value: 0.06,
//     totalTokens: 1000,
//     redeemedTokens: 12000,
//     name: 'AHT',
//     type: 'Vested',
//     issuer: 'Ergopad',
//   },
//   {
//     value: 0.98,
//     totalTokens: 10000,
//     name: 'SigUSD',
//     type: 'Loaned',
//     issuer: 'Duckpools',
//     apyPct: 24
//   },
//   {
//     value: 1.12,
//     totalTokens: 1200.5,
//     name: 'Ergo',
//     type: 'Loan Collateral',
//     issuer: 'Duckpools',
//     apyPct: 2394
//   },

// ]