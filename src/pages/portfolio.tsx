import React, { FC, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  List,
  ListItem,
  Container,
  Paper,
  Divider
} from '@mui/material';
import Grid from '@mui/system/Unstable_Grid/Grid';
import Balance from '@components/portfolio/Balance';
import { IPieToken } from '@components/charts/PieChart';
import TokenSummary from '@components/portfolio/TokenSummary';

export interface IExtendedToken extends IPieToken {
  name: string;
  tokenId: string;
  pctChange: number; // expressed with 2 decimals. 100 = 1.00%
}

const sampleTokensList: IExtendedToken[] = [
  {
    name: 'Ergo',
    tokenId: '0000000000000000000000000000000000000000000000000000000000000000',
    pctChange: 212,
    symbol: 'ERG',
    amount: 1234,
    value: 1.34
  },
  {
    name: 'Ergopad',
    tokenId: 'd71693c49a84fbbecd4908c94813b46514b18b67a99952dc1e6e4791556de413',
    pctChange: -34,
    symbol: 'Ergopad',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Duckpools',
    tokenId: '089990451bb430f05a85f4ef3bcb6ebf852b3d6ee68d86d78658b9ccef20074f',
    pctChange: 212,
    symbol: 'QUACKS',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Tabby POS',
    tokenId: '',
    pctChange: 111,
    symbol: 'EPOS',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Paideia',
    tokenId: '1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489',
    pctChange: -474,
    symbol: 'PAI',
    amount: 230461,
    value: 0.0036
  },
  {
    name: 'Sigma USD',
    tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
    pctChange: 12,
    symbol: 'SigUSD',
    amount: 1234,
    value: 1.34
  },
  {
    name: 'Cyberverse',
    tokenId: '01dce8a5632d19799950ff90bca3b5d0ca3ebfa8aaafd06f0cc6dd1e97150e7f',
    pctChange: 233,
    symbol: 'CYPX',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Spectrum Finance',
    tokenId: '9a06d9e545a41fd51eeffc5e20d818073bf820c635e2a9d922269913e0de369d',
    pctChange: 452,
    symbol: 'SPF',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Walrus DAO',
    tokenId: '59ee24951ce668f0ed32bdb2e2e5731b6c36128748a3b23c28407c5f8ccbf0f6',
    pctChange: 2401,
    symbol: 'WALRUS',
    amount: 230461,
    value: 0.0054
  },
  {
    name: 'Qwerty',
    tokenId: '',
    pctChange: 222,
    symbol: 'ASFD',
    amount: 230461,
    value: 0.0036
  },
]

const Portfolio = () => {


  return (
    <Container>
      <Grid container>
        <Grid xs={12} md={9}>
          <Paper sx={{ p: 3, width: '100%' }}>
            <Grid container spacing={4}>
              <Grid xs={12} sm={5} >
                <Balance />
              </Grid>
              <Grid xs={12} sm={7} container>
                <Grid><Divider orientation="vertical" /></Grid>
                <Grid xs>
                  <TokenSummary tokenList={sampleTokensList} currency="USD" />
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Portfolio;