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

export type PaymentInstrument = ArrayElement<
  Awaited<ReturnType<typeof findPaymentInstruments>>
>;

interface AddBalanceFormProps {
  address: string;
  amount: string;
}

const ManagePaymentInstruments = () => {
  const session = useSession();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("sm"));
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);
  const [tokenList, setTokenList] = useState(allowedTokens);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(
    null
  );
  const [addBalance, setAddBalance] = useState<AddBalanceFormProps>({
    address: session.data?.user.address ?? "",
    amount: "0",
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [ergopayUrl, setErgopayUrl] = useState<string | null>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const [popoverProps, setPopoverProps] = useState({
    transactionId: "",
    error: "",
  });
  const [loading, setLoading] = useState(true);
  const [dialogLoading, setDialogLoading] = useState(false);

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
    setSelectedInstrument(paymentInstrumentId);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setAddBalance({
      address: session.data?.user.address ?? "",
      amount: "0",
    });
    setSelectedInstrument(null);
    setOpenDialog(false);
  };

  const handleOpenPopover = (transactionId: string) => {
    setPopoverProps({ transactionId: transactionId, error: "" });
    setOpenPopover(true);
  };

  const handleOpenPopoverError = (error: string) => {
    setPopoverProps({ transactionId: "", error: error });
    setOpenPopover(true);
  };

  const handleClosePopover = () => {
    setPopoverProps({ transactionId: "", error: "" });
    setOpenPopover(false);
  };

  const submitTransaction = async () => {
    if (Number(addBalance.amount) <= 0) {
      return;
    }
    setDialogLoading(true);
    try {
      const paymentInstrument = paymentInstruments.filter(
        (paymentInstrument) => paymentInstrument.id === selectedInstrument
      )[0];
      const tokenDetails = getTokenDetails(paymentInstrument.tokenId);
      const addBalanceResponse = await addBalanceMutation.mutateAsync({
        address: addBalance.address,
        paymentInstrumentId: paymentInstrument.id,
        amount: Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals),
      });
      const unsignedTransaction =
        addBalanceResponse.unsignedTransaction.unsignedTransaction;
      const wallet = await getErgoWalletContext();
      const signedTransaction = await wallet.sign_tx(unsignedTransaction);
      const tx = await wallet.submit_tx(signedTransaction);
      handleOpenPopover(tx);
      await query.refetch();
      handleClose();
    } catch (e: any) {
      handleOpenPopoverError(e.toString());
    }
    setDialogLoading(false);
  };

  const submitErgoPayRequest = async () => {
    if (Number(addBalance.amount) <= 0) {
      return;
    }
    setDialogLoading(true);
    try {
      const paymentInstrument = paymentInstruments.filter(
        (paymentInstrument) => paymentInstrument.id === selectedInstrument
      )[0];
      const tokenDetails = getTokenDetails(paymentInstrument.tokenId);
      const addBalanceResponse = await addBalanceMutation.mutateAsync({
        address: addBalance.address,
        paymentInstrumentId: paymentInstrument.id,
        amount: Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals),
      });
      const reducedTransactionUrl =
        addBalanceResponse.unsignedTransaction.reducedTransaction;
      setErgopayUrl(reducedTransactionUrl);
    } catch (e: any) {
      handleOpenPopoverError(e.toString());
    }
    setDialogLoading(false);
  };

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

  const getTokenDetails = (tokenId: string | null) => {
    return tokenList.filter(
      (token) =>
        token.id === tokenId ||
        (token.id === ERG_TOKEN_ID_MAP && tokenId === null)
    )[0];
  };

  return (
    <Fragment>
      <Paper
        variant="outlined"
        sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          View and Manage existing Payment Instruments
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
                    <Typography>Id: {paymentInstrument.id}</Typography>
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
                    </Typography>
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
                      "There are no charges for this Payment Instrument."}
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
                      "There are no transactions for this Payment Instrument."}
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
      <Dialog
        open={openDialog}
        onClose={handleClose}
        aria-labelledby="payment-instrument-add-balance-dialog-title"
        aria-describedby="payment-instrument-add-balance-dialog-description"
      >
        <DialogTitle id="payment-instrument-add-balance-dialog-title">
          Add Balance to Payment Instrument
        </DialogTitle>
        {ergopayUrl ? (
          <DialogContent>
            <ErgopayQrCode url={ergopayUrl} />
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogContentText id="payment-instrument-add-balance-dialog-description">
              Add the required amount to your Payment Instrument for
              subscriptions. The Payment Instrument will be auto charged to
              renew subscriptions. Balance will be updated after 2 confirmations
              on chain. Note that balance added to a Payment Instrument is
              non-refundable.
              <TextField
                sx={{ mt: 2 }}
                id="payment-instrument-add-balance-address"
                label="Address"
                value={addBalance.address}
                onChange={(e) =>
                  setAddBalance({
                    ...addBalance,
                    address: e.target.value,
                  })
                }
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                sx={{ mt: 2 }}
                id="payment-instrument-add-balance-amount"
                label="Amount"
                type="number"
                value={addBalance.amount}
                onChange={(e) =>
                  setAddBalance({
                    ...addBalance,
                    amount: e.target.value,
                  })
                }
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </DialogContentText>
          </DialogContent>
        )}
        {ergopayUrl ? (
          <DialogActions sx={{ pb: 2 }}>
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ pb: 2 }}>
            <LoadingButton
              onClick={submitErgoPayRequest}
              autoFocus
              loading={dialogLoading}
            >
              Pay with Mobile
            </LoadingButton>
            <LoadingButton
              onClick={submitTransaction}
              autoFocus
              loading={dialogLoading}
            >
              Pay with Nautilus
            </LoadingButton>
            <Button onClick={handleClose}>Cancel</Button>
          </DialogActions>
        )}
      </Dialog>
      <Popover
        id="payment-instrument-add-balance-amount-popover"
        open={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        sx={{
          maxWidth: "500px",
          mt: "10px",
          "& .MuiPopover-paper": {
            overflow: "hidden",
            background: theme.palette.background.paper,
          },
        }}
      >
        <Box
          sx={{
            minWidth: "420px",
            minHeight: "80px",
            p: 2,
          }}
        >
          {popoverProps.transactionId && (
            <>
              <Typography>Transaction Submitted.</Typography>
              <Typography sx={{ pt: 1 }}>
                <Link
                  href={`https://explorer.ergoplatform.com/en/transactions/${popoverProps.transactionId}`}
                  sx={{
                    color: "#7bd1be",
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {popoverProps.transactionId}
                </Link>
              </Typography>
            </>
          )}
          {popoverProps.error && (
            <>
              <Typography sx={{ color: theme.palette.primary.main }}>
                ERROR
              </Typography>
              <Typography sx={{ pt: 1 }}>{popoverProps.error}</Typography>
            </>
          )}
        </Box>
      </Popover>
    </Fragment>
  );
};

export default ManagePaymentInstruments;
