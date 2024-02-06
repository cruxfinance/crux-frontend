import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Paper
} from "@mui/material";
import { useWallet } from '@lib/contexts/WalletContext';
import { toCamelCase } from '@server/utils/camelCase';
import dayjs from 'dayjs';
import { currencies, Currencies } from '@lib/utils/currencies';
import { getShorterAddress } from '@lib/utils/general';
import { trpc } from '@lib/trpc';

interface IReportsTable {
  currency: Currencies
}

const ReportsTable: FC<IReportsTable> = ({ currency }) => {
  const currencySymbol = currencies[currency]
  const { sessionData, sessionStatus } = useWallet()
  const [loading, setLoading] = useState(false)
  const theme = useTheme()

  const transactions = trpc.accounting.getTransactions.useQuery(
    { addresses: [sessionData?.user.address ?? ''] },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const data = transactions.data

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', colorScheme: 'dark' }}>
      <Box sx={{ maxHeight: '80vh', width: '100%', overflow: 'auto', }}>
        {loading
          ? <Box sx={{ py: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <CircularProgress size={60} />
            </Box>
            <Typography>
              Loading data...
            </Typography>
          </Box>
          : <Table size="small">
            <TableHead
              style={{
                zIndex: 2,
                position: 'sticky',
                top: 0,
                transition: 'transform 0.1s ease',
                background: theme.palette.background.default
              }}
            >
              <TableRow>
                {headers.map((header, index) => (
                  <TableCell
                    key={`header-${index}`}
                    colSpan={1}
                    sx={{ zIndex: 2 }}
                  >
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Box>
                        <Typography>
                          {header}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody sx={{
              '& > tr:last-child > td': {
                borderBottom: 'none',
              }
            }}>
              {data && data.map((row, index) => {
                const date = dayjs(row.time * 1000).format('YYYY/MM/DD HH:MM')
                return (
                  <TableRow key={`row-${index}`}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(205,205,235,0.05)'
                          : 'rgba(0,0,0,0.05)'
                      },
                      '&:hover': {
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(205,205,235,0.15)'
                          : 'rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <TableCell>
                      <Typography>{date}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: '190px' }}>
                      {row.transactionElements.map((transaction, i) => (
                        <Typography key={i} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {transaction.tokenName === 'erg' ? 'Erg' : transaction.tokenName}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      {row.transactionElements.map((transaction, i) => {
                        const amount = transaction.tokenAmount / Math.pow(10, transaction.tokenDecimals)
                        return (
                          <Typography key={i}>{amount}</Typography>
                        )
                      })}
                    </TableCell>
                    {/* Token value */}
                    <TableCell>
                      {row.transactionElements.map((transaction, i) => {
                        const amount = transaction.tokenAmount / Math.pow(10, transaction.tokenDecimals)
                        const currencyKey = currency === 'ERG' ? 'erg' : 'usd';
                        if (transaction.tokenValue[currencyKey] * amount > 0) {
                          return (
                            <Typography key={i}>
                              {currencySymbol}{(transaction.tokenValue[currencyKey] * amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </Typography>
                          );
                        } else {
                          return <Typography key={`none-${i}`}>-</Typography>;
                        }
                      })}
                    </TableCell>
                    {/* Transaction type */}
                    <TableCell>
                      {row.transactionElements.map((transaction, i) => (
                        <Typography key={i}>{
                          sessionData?.user.address && transaction.fromAddress?.includes(sessionData?.user.address)
                            ? 'Debit'
                            : 'Credit'
                        }</Typography>
                      ))}
                    </TableCell>
                    {/* Sender */}
                    <TableCell>
                      {row.transactionElements.map((transaction, i) => (
                        <Typography key={i}>{getShorterAddress(transaction.fromAddress, 6)}</Typography>
                      ))}
                    </TableCell>
                    {/* Recipient */}
                    <TableCell>
                      {row.transactionElements.map((transaction, i) => (
                        <Typography key={i}>{getShorterAddress(transaction.toAddress, 6)}</Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
      </Box>
    </Paper>
  );
};

export default ReportsTable;

const headers = [
  "Date",
  "Asset",
  "Amount",
  "Value",
  "Type", // debit / credit / internal transfer
  "Sender",
  "Recipient"
]