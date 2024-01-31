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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { findPaymentInstruments } from "@server/services/subscription/paymentInstrument";
import { Fragment, useEffect, useState } from "react";
import {
  ERG_TOKEN_ID_MAP,
  allowedTokens,
  getIcon,
} from "./CreatePaymentInstrument";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LoadingButton } from "@mui/lab";
import { useSession } from "next-auth/react";
import Link from "@components/Link";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type PaymentInstrument = ArrayElement<
  Awaited<ReturnType<typeof findPaymentInstruments>>
>;

const ManagePaymentInstruments = () => {
  const session = useSession();
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);
  const [tokenList, setTokenList] = useState(allowedTokens);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(
    null
  );
  const [addBalanceAmount, setAddBalanceAmount] = useState<string>("0");
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogLoading, setDialogLoading] = useState(false);

  const query = trpc.subscription.findPaymentInstruments.useQuery(undefined, {
    onSuccess: (data) => {
      setPaymentInstruments(data);
      setLoading(false);
    },
  });
  const addBalanceMutation =
    trpc.subscription.addPaymentInstrumentBalance.useMutation();

  const handleOpen = (paymentInstrumentId: string) => {
    setSelectedInstrument(paymentInstrumentId);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setAddBalanceAmount("0");
    setSelectedInstrument(null);
    setOpenDialog(false);
  };

  const submitTransaction = async () => {
    if (Number(addBalanceAmount) <= 0) {
      return;
    }
    setDialogLoading(true);
    try {
      const paymentInstrument = paymentInstruments.filter(
        (paymentInstrument) => paymentInstrument.id === selectedInstrument
      )[0];
      const tokenDetails = getTokenDetails(paymentInstrument.tokenId);
      const addBalanceResponse = await addBalanceMutation.mutateAsync({
        address: session.data?.user.address ?? "",
        paymentInstrumentId: paymentInstrument.id,
        amount: Number(addBalanceAmount) * Math.pow(10, tokenDetails.decimals),
      });
      await query.refetch();
      handleClose();
    } catch (e) {
      console.error(e);
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
      <Paper sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Current Balances
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
            <Accordion key={paymentInstrument.id}>
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
                    <Typography sx={{ textAlign: "right", mr: 2 }}>
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
                  <Typography variant="h6">Details</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography>Id: {paymentInstrument.id}</Typography>
                    <Typography>
                      TokenId: {paymentInstrument.tokenId ?? ERG_TOKEN_ID_MAP}
                    </Typography>
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
                  <Typography variant="h6">Charges</Typography>
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
                  <Typography variant="h6">Transactions</Typography>
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
                                      href={`https://explorer.ergoplatform.com/en/addresses/${transaction.id}`}
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
        <DialogContent>
          <DialogContentText id="payment-instrument-add-balance-dialog-description">
            Balance added to a Payment Instrument is non-refundable.
            <TextField
              sx={{ mt: 2 }}
              id="payment-instrument-add-balance-amount"
              label="Amount"
              type="number"
              value={addBalanceAmount}
              onChange={(e) => setAddBalanceAmount(e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            onClick={submitTransaction}
            autoFocus
            loading={dialogLoading}
          >
            Submit Transaction
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export default ManagePaymentInstruments;