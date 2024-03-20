


import React, { FC, useState, useEffect } from 'react';
import {
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { trpc } from '@lib/trpc';
import { ERG_TOKEN_ID_MAP, allowedTokens } from '@lib/configs/paymentTokens';
import { useAlert } from '@contexts/AlertContext';

interface IVerifyReportPaymentProps {
  report: TReport;
  confirmedPaymentCallback: () => void;
}

const VerifyReportPayment: FC<IVerifyReportPaymentProps> = ({
  report,
  confirmedPaymentCallback
}) => {
  const { addAlert } = useAlert();

  const reportTxs = trpc.accounting.listReportTxs.useQuery({
    reportId: report.id
  })

  const txIds = reportTxs.data?.filter(tx => tx.txId !== null && tx.txId !== undefined).map(tx => tx.txId as string) ?? [];

  const checkTxStatusesQuery = trpc.accounting.checkReportTxStatuses.useMutation()

  const [transactionStatuses, setTransactionStatuses] = useState<{
    status: "CONFIRMED" | "PENDING" | "NOT_FOUND";
    txId: string;
  }[]>([])

  useEffect(() => {
    let intervalId: NodeJS.Timer;
    const checkTransactions = async () => {
      try {
        const checkTxs = await checkTxStatusesQuery.mutateAsync({ txIds });
        setTransactionStatuses(checkTxs);

        const anyConfirmed = checkTxs.some(tx => tx.status === 'CONFIRMED');
        if (anyConfirmed) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error checking transaction statuses:", error);
        clearInterval(intervalId);
      }
    };

    if (txIds.length > 0) {
      checkTransactions(); // Check immediately on effect run
      intervalId = setInterval(checkTransactions, 5000); // Then every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [JSON.stringify(txIds)]);

  const verifyTransactionMutation = trpc.accounting.verifyReportPurchaseTransaction.useMutation();

  useEffect(() => {
    if (transactionStatuses.length > 0) {
      transactionStatuses.forEach(({ txId, status }) => {
        if (status === 'CONFIRMED') {
          // Attempt to verify the transaction status
          verifyTransactionMutation.mutate({
            txId,
            reportId: report.id,
          }, {
            onSuccess: () => {
              addAlert('success', 'Report payment confirmed')
              confirmedPaymentCallback()
              console.log(`Transaction ${txId} verified successfully.`);
            },
            onError: (error) => {
              // Handle error, such as transaction not found
              console.error(`Error verifying transaction ${txId}:`, error.message);
              // Optionally, stop further attempts or log this error appropriately
            },
          });
        }
      });
    }
  }, [JSON.stringify(transactionStatuses)]);

  const getTokenDetails = (tokenId: string | null) => {
    return allowedTokens.filter(
      (token) =>
        token.id === tokenId ||
        (token.id === ERG_TOKEN_ID_MAP && tokenId === null)
    )[0];
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Pending payments for this report</Typography>
        </Box>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>TransactionId</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>CreatedAt</TableCell>
                <TableCell>UpdatedAt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportTxs.data && reportTxs.data.map((transaction, index) => {
                const amounts = transaction.amounts as unknown as TransferAmount[]
                return (
                  <TableRow
                    key={transaction.id}
                    sx={{
                      "&:last-child td, &:last-child th": {
                        border: 0,
                      },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography sx={{
                        color: "#7bd1be",
                        cursor: "pointer",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                        maxWidth: '190px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}>
                        <a
                          href={`https://explorer.ergoplatform.com/en/transactions/${transaction.txId}`}

                          target="_blank"
                        >
                          {transaction.txId}
                        </a>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {amounts.map((item) => {
                        const tokenDeets = getTokenDetails(item.tokenId)
                        return (
                          `${(item.amount / Math.pow(10, tokenDeets.decimals ?? 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} 
                          ${tokenDeets.name}`
                        )
                      })}
                    </TableCell>
                    <TableCell>{transaction.status}</TableCell>
                    <TableCell>
                      {transaction.createdAt.toUTCString()}
                    </TableCell>
                    <TableCell>
                      {transaction.updatedAt.toUTCString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default VerifyReportPayment;