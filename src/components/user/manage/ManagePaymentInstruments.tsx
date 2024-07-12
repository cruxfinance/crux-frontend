import { trpc } from "@lib/trpc";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { findPaymentInstruments } from "@server/services/subscription/paymentInstrument";
import { Fragment, useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LoadingButton } from "@mui/lab";
import { useSession } from "next-auth/react";
import Link from "@components/Link";
import { getErgoWalletContext } from "@contexts/WalletContext";
import ErgopayQrCode from "../ErgopayQrCode";
import { allowedTokens, getIcon, ERG_TOKEN_ID_MAP } from "@lib/configs/paymentTokens";
import PayPaymentInstrumentDialog from "@components/payments/PayPaymentInstrumentDialog";

export type PaymentInstrument = ArrayElement<
  Awaited<ReturnType<typeof findPaymentInstruments>>
>;

const ManagePaymentInstruments = () => {
  const session = useSession();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("sm"));
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);
  const [tokenList, setTokenList] = useState(allowedTokens);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [selectedPaymentInstrument, setSelectedPaymentInstrument] = useState<PaymentInstrument | undefined>(undefined);
  const [selectedTokenDetails, setSelectedTokenDetails] = useState<AllowedToken | undefined>(undefined)
  const [order, setOrder] = useState<TransferAmount[]>([])

  const getTokenDetails = (tokenId: string | null) => {
    return tokenList.filter(
      (token) =>
        token.id === tokenId ||
        (token.id === ERG_TOKEN_ID_MAP && tokenId === null)
    )[0];
  };

  const query =
    trpc.subscription.findOrCreateDefaultPaymentInstruments.useQuery(
      undefined,
      {
        onSuccess: (data) => {
          setPaymentInstruments(data);
          setLoading(false);
        },
      }
    );
  const addBalanceMutation =
    trpc.subscription.addPaymentInstrumentBalance.useMutation();

  const handleOpen = (paymentInstrumentId: string) => {
    const newSelectedInstrument = paymentInstruments.find(instrument => instrument.id === paymentInstrumentId);
    if (newSelectedInstrument) {
      setSelectedTokenDetails(getTokenDetails(newSelectedInstrument.tokenId))
      setSelectedPaymentInstrument(newSelectedInstrument)
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  // const submitTransaction = async () => {
  //   if (Number(addBalance.amount) <= 0) {
  //     return;
  //   }
  //   setDialogLoading(true);
  //   try {
  //     const paymentInstrument = paymentInstruments.filter(
  //       (paymentInstrument) => paymentInstrument.id === selectedInstrument
  //     )[0];
  //     const tokenDetails = getTokenDetails(paymentInstrument.tokenId);
  //     const addBalanceResponse = await addBalanceMutation.mutateAsync({
  //       address: addBalance.address,
  //       paymentInstrumentId: paymentInstrument.id,
  //       amount: Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals),
  //     });
  //     const unsignedTransaction =
  //       addBalanceResponse.unsignedTransaction.unsignedTransaction;
  //     const wallet = await getErgoWalletContext();
  //     const signedTransaction = await wallet.sign_tx(unsignedTransaction);
  //     const tx = await wallet.submit_tx(signedTransaction);
  //     handleOpenPopover(tx);
  //     await query.refetch();
  //     handleClose();
  //   } catch (e: any) {
  //     handleOpenPopoverError(e?.info ?? e.toString());
  //   }
  //   setDialogLoading(false);
  // };

  // const submitErgoPayRequest = async () => {
  //   if (Number(addBalance.amount) <= 0) {
  //     return;
  //   }
  //   setDialogLoading(true);
  //   try {
  //     const paymentInstrument = paymentInstruments.filter(
  //       (paymentInstrument) => paymentInstrument.id === selectedInstrument
  //     )[0];
  //     const tokenDetails = getTokenDetails(paymentInstrument.tokenId);
  //     const addBalanceResponse = await addBalanceMutation.mutateAsync({
  //       address: addBalance.address,
  //       paymentInstrumentId: paymentInstrument.id,
  //       amount: Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals),
  //     });
  //     const reducedTransactionUrl =
  //       addBalanceResponse.unsignedTransaction.reducedTransaction;
  //     setErgopayUrl(reducedTransactionUrl);
  //   } catch (e: any) {
  //     handleOpenPopoverError(e.toString());
  //   }
  //   setDialogLoading(false);
  // };

  useEffect(() => {
    const resolveIcons = async () => {
      try {
        const iconPromises = tokenList.map((token) => getIcon(token.id));
        const icons = await Promise.all(iconPromises);
        setTokenList(
          tokenList.map((token, index) => {
            return {
              ...token,
              icon: icons[index],
            };
          })
        );
      } catch (e) {
        console.error(e);
      }
    };
    resolveIcons();
  }, []);

  return (
    <Fragment>
      <Paper
        variant="outlined"
        sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          View and Manage existing balances
        </Typography>
        <Typography sx={{ fontSize: '0.9rem!important', mb: 2 }}>
          You need an existing balance to maintain a subscription. A subscription can be attached to only one currency at a time. When the balance runs out, your subscription will be suspended until you load it again.
        </Typography>
        <Box>
          {loading && (
            <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {!loading &&
            paymentInstruments.length === 0 &&
            "There are no PaymentInstruments assosiated with your account."}
          {paymentInstruments.map((paymentInstrument) => (
            <Accordion variant="outlined" key={paymentInstrument.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Grid container sx={{ py: 1 }}>
                  <Grid item xs={8}>
                    <Box display="flex">
                      <Avatar
                        src={
                          getTokenDetails(paymentInstrument.tokenId)?.icon ?? ""
                        }
                        sx={{ width: "24px", height: "24px" }}
                      />
                      <Typography sx={{ ml: 1 }}>
                        {getTokenDetails(paymentInstrument.tokenId)?.name ?? ""}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography
                      sx={{
                        textAlign: "right",
                        mr: 2,
                        width: desktop ? null : "80px",
                      }}
                    >
                      Balance:{" "}
                      {(
                        Number(paymentInstrument.balance) /
                        Math.pow(
                          10,
                          getTokenDetails(paymentInstrument.tokenId)
                            ?.decimals ?? 0
                        )
                      ).toString()}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionSummary>
              <AccordionDetails>
                <Paper
                  sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Details
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    {/* <Typography>Id: {paymentInstrument.id}</Typography>
                    {desktop && (
                      <Typography>
                        TokenId: {paymentInstrument.tokenId ?? ERG_TOKEN_ID_MAP}
                      </Typography>
                    )}
                    <Typography>Status: {paymentInstrument.status}</Typography>
                    <Typography>
                      CreatedAt: {paymentInstrument.createdAt.toUTCString()}
                    </Typography>
                    <Typography>
                      UpdatedAt: {paymentInstrument.updatedAt.toUTCString()}
                    </Typography> */}
                    <Button
                      sx={{ mt: 1 }}
                      variant="outlined"
                      onClick={() => handleOpen(paymentInstrument.id)}
                    >
                      Add Balance
                    </Button>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Charges
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    {paymentInstrument.charges.length === 0 &&
                      "There are no charges for this currency."}
                    {paymentInstrument.charges.length !== 0 && (
                      <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                          <TableHead>
                            <TableRow>
                              <TableCell>ChargeId</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>CreatedAt</TableCell>
                              <TableCell>UpdatedAt</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paymentInstrument.charges.map((charge) => (
                              <TableRow
                                key={charge.id}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                }}
                              >
                                <TableCell component="th" scope="row">
                                  {charge.id}
                                </TableCell>
                                <TableCell>
                                  {Number(charge.amount) /
                                    Math.pow(
                                      10,
                                      getTokenDetails(paymentInstrument.tokenId)
                                        ?.decimals ?? 0
                                    )}
                                </TableCell>
                                <TableCell>
                                  {charge.createdAt.toUTCString()}
                                </TableCell>
                                <TableCell>
                                  {charge.updatedAt.toUTCString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Transactions
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    {paymentInstrument.transactions.length === 0 &&
                      "There are no transactions for this currency."}
                    {paymentInstrument.transactions.length !== 0 && (
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
                            {paymentInstrument.transactions.map(
                              (transaction) => (
                                <TableRow
                                  key={transaction.id}
                                  sx={{
                                    "&:last-child td, &:last-child th": {
                                      border: 0,
                                    },
                                  }}
                                >
                                  <TableCell component="th" scope="row">
                                    <Link
                                      href={`https://explorer.ergoplatform.com/en/transactions/${transaction.id}`}
                                      sx={{
                                        color: "#7bd1be",
                                        cursor: "pointer",
                                        "&:hover": {
                                          textDecoration: "underline",
                                        },
                                      }}
                                    >
                                      {transaction.id.substring(0, 10)}...
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    {Number(transaction.amount) /
                                      Math.pow(
                                        10,
                                        getTokenDetails(
                                          paymentInstrument.tokenId
                                        )?.decimals ?? 0
                                      )}
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
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Paper>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Paper>
      {selectedPaymentInstrument && selectedTokenDetails && (
        <PayPaymentInstrumentDialog
          open={openDialog}
          setOpen={setOpenDialog}
          paymentInstrument={selectedPaymentInstrument}
          tokenDetails={selectedTokenDetails}
        />
      )}
    </Fragment>
  );
};

export default ManagePaymentInstruments;
