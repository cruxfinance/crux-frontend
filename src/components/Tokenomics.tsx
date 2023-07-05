import React, { FC, useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  Typography,
  useTheme
} from '@mui/material';
import { Fragment } from 'react';
import { useRouter } from 'next/router';

const tokenomicsHeading: { [K in keyof TokenomicsData]: string } = {
  name: 'Name',
  amount: 'Amount',
  pct: 'Percent',
  value: 'Value',
  tge: 'TGE',
  length: 'Length',
  lockup: 'Cliff',
};

const tokenomicsKeys = Object.keys(tokenomicsHeading) as (keyof typeof tokenomicsHeading)[];
const tokenomicsHeadingValues = Object.values(tokenomicsHeading);

export type TokenomicsData = {
  name: string;
  amount: number;
  pct: string;
  value: number | string;
  tge: string;
  length: string;
  lockup: string;
};

type TokenomicsProps = {
  data: TokenomicsData[];
  total: number;
  name: string;
  ticker: string;
};

const Tokenomics: FC<TokenomicsProps> = ({ data, total, name, ticker }) => {
  const theme = useTheme()
  const router = useRouter()
  const checkSmall = useMediaQuery(theme.breakpoints.up('md'));
  const totalTokens = total ? total : 0;
  const tokenName = name ? name : '';
  const tokenTicker = ticker ? ticker : '';
  const tokenomics = data ? data : [];

  const largeHeading = tokenomicsHeadingValues.map((value, i) => {
    return (
      <TableCell key={i} sx={{ fontWeight: '800' }}>
        {value}
      </TableCell>
    );
  });

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Token Name:
        <Typography
          component="span"
          color="text.primary"
          sx={{ fontWeight: '700' }}
        >
          {' '}
          {tokenName}
        </Typography>
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Token Ticker:
        <Typography
          component="span"
          color="text.primary"
          sx={{ fontWeight: '700' }}
        >
          {' '}
          {tokenTicker}
        </Typography>
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Total Distribution:
        <Typography
          component="span"
          color="text.primary"
          sx={{ fontWeight: '700' }}
        >
          {' '}
          {totalTokens.toLocaleString(router.locale, {
            maximumFractionDigits: 0,
          })}
        </Typography>
      </Typography>
      {checkSmall ? (
        <Table>
          <TableHead>
            <TableRow>{largeHeading}</TableRow>
          </TableHead>
          <TableBody>
            {tokenomics.map((round, i) => {
              const keysLoop = tokenomicsKeys.map((key) => {
                return (
                  <TableCell key={key}>
                    {round && typeof round[key] === 'number' ? round[key].toLocaleString(router.locale, {
                      maximumFractionDigits: key === 'value' ? 4 : 0,
                    }) : round[key]}
                  </TableCell>
                );
              });
              return <TableRow key={round.name + i}>{keysLoop}</TableRow>;
            })}
          </TableBody>
        </Table>
      ) : (
        <Table sx={{ p: 0 }}>
          <TableBody>
            {tokenomics.map((round) => {
              const keysLoop = tokenomicsKeys.map((key, i) => {
                if (round?.[key] && round[key] !== "-") {
                  if (i === 0) {
                    return (
                      <TableRow key={i} sx={{ borderTop: `1px solid #444` }}>
                        <TableCell
                          sx={{
                            color: theme.palette.text.secondary,
                            border: 'none',
                            p: 1,
                          }}
                        >
                          {tokenomicsHeading[key]}:
                        </TableCell>
                        <TableCell sx={{ border: 'none', p: 1, pt: 2 }}>
                          {round[key]}
                        </TableCell>
                      </TableRow>
                    );
                  } else if (i < tokenomicsKeys.length - 1) {
                    return (
                      <TableRow key={i}>
                        <TableCell
                          sx={{
                            color: theme.palette.text.secondary,
                            border: 'none',
                            p: 1,
                          }}
                        >
                          {tokenomicsHeading[key]}:
                        </TableCell>
                        <TableCell sx={{ border: 'none', p: 1 }}>
                          {round && typeof round[key] === 'number' ? round[key].toLocaleString(router.locale, {
                            maximumFractionDigits: key === 'value' ? 4 : 0,
                          }) : round[key]}
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    return (
                      <TableRow key={i}>
                        <TableCell
                          sx={{
                            color: theme.palette.text.secondary,
                            border: 'none',
                            p: 1,
                          }}
                        >
                          {tokenomicsHeading[key]}:
                        </TableCell>
                        <TableCell sx={{ border: 'none', p: 1, pb: 2 }}>
                          {round?.[key]}
                        </TableCell>
                      </TableRow>
                    );
                  }
                }
              });
              return <Fragment key={round.name}>{keysLoop}</Fragment>;
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default Tokenomics;
