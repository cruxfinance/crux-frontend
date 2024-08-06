import React, { FC, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Button,
  IconButton,
  Alert,
  Switch,
  Box,
  Typography,
  Collapse,
  Slide,
  Grow,
  ButtonGroup,
  Paper,
  Skeleton,
  TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import { flexColumn, flexRow } from '@lib/flex';
import { allowedTokens } from '@lib/configs/paymentTokens';
import { getErgoWalletContext } from "@contexts/WalletContext";
import { getPriceForProduct, productCosts } from '@lib/configs/productCosts';
import ProcessPayment from '@components/payments/ProcessPayment';
import { LoadingButton } from '@mui/lab';
import { PaymentInstrument } from '@components/user/manage/ManagePaymentInstruments';
import { useWallet } from "@lib/contexts/WalletContext";

interface IPayPaymentInstrumentDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  paymentInstrument: PaymentInstrument;
  tokenDetails: AllowedToken;
}

interface AddBalanceFormProps {
  address: string;
  amount: string;
}

const PayPaymentInstrumentDialog: FC<IPayPaymentInstrumentDialogProps> = ({
  open,
  setOpen,
  paymentInstrument,
  tokenDetails
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert()
  const { sessionStatus, sessionData } = useWallet()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [prepaidToggle, setprepaidToggle] = useState(false)
  const [showComponent, setShowComponent] = useState(true);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const walletList = trpc.user.getWallets.useQuery()
  const [walletsList, setWalletsList] = useState<WalletListItem[]>([])
  const [buttonChoice, setButtonChoice] = useState('erg')
  const [prices, setPrices] = useState({
    basePrice: productCosts.find(item => item.product === 'report')?.basePrice,
    discountedPrice: productCosts.find(item => item.product === 'report')?.basePrice,
    percentOff: 0,
    additionalPercentOff: 0
  })
  const [priceInCurrency, setPriceInCurrency] = useState<string>('')
  const [addBalance, setAddBalance] = useState<AddBalanceFormProps>({
    address: sessionData?.user.address ?? "",
    amount: "0",
  });

  useEffect(() => {
    const checkedPrices = getPriceForProduct('report', sessionData?.user.privilegeLevel && sessionData?.user.privilegeLevel !== "ADMIN" ? sessionData?.user.privilegeLevel : "DEFAULT", buttonChoice)
    setPrices(checkedPrices)
  }, [sessionData, buttonChoice])

  useEffect(() => {
    if (walletList.data && walletList.data.success) {
      // Filter based on the selected ones
      const selectedLoginWallets = walletList.data.walletList.filter(wallet => selectedWallets.includes(`wallet-${wallet.id}`));
      const selectedAddedWallets = walletList.data.addedWalletList.filter(wallet => selectedWallets.includes(`added-${wallet.id}`));

      // Prepare wallets with addresses and names
      const wallets = [
        ...selectedLoginWallets,
        ...selectedAddedWallets
      ].map(wallet => ({
        addresses: [...new Set([wallet.changeAddress, ...wallet.unusedAddresses, ...wallet.usedAddresses])], // Remove duplicates
        name: wallet.changeAddress
      }));

      setWalletsList(wallets);
    }
  }, [walletList.data, selectedWallets]);

  const handleClose = () => {
    setOpen(false);
  };

  const addBalanceMutation =
    trpc.subscription.addPaymentInstrumentBalance.useMutation();

  const handleSubmitTx = async (txId: string) => {
    await addBalanceMutation.mutateAsync({
      address: addBalance.address,
      paymentInstrumentId: paymentInstrument.id,
      amount: Math.round(Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals)),
      txId
    });
  }

  const [order, setOrder] = useState<TransferAmount[]>([])
  const [paymentWalletType, setPaymentWalletType] = useState<'nautilus' | 'mobile' | undefined>(undefined)

  const generateOrder = (walletType: 'nautilus' | 'mobile') => {
    // console.log(prices.discountedPrice)
    // console.log(tokenInfo?.data?.priceInUsd)
    // console.log(tokenInfo)

    setPaymentWalletType(walletType)

    const numberTokens = Math.round(Number(addBalance.amount) * Math.pow(10, tokenDetails.decimals))
    setOrder([{
      tokenId: tokenDetails.id,
      amount: numberTokens
    }])
  }

  const handleExitedDialog = () => {
    // do stuff
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      PaperProps={{
        variant: 'outlined',
        elevation: 0
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(3px)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }
      }}
      TransitionProps={{
        onExited: handleExitedDialog,
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: "800",
          fontSize: "32px",
        }}
      >
        Add {tokenDetails.name} Balance.
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>
      <Collapse in={!paymentWalletType}>
        <DialogContent sx={{ minWidth: '350px', maxWidth: !fullScreen ? '460px' : null }}>
          <Typography sx={{ mb: 2 }}>
            This balance will be auto charged to renew active subscriptions. Balance will
            be updated after 2 confirmations on chain. Note that the balance added is
            non-refundable.
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
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
          </Paper>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', alignItems: 'flex-end', p: 1 }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ ...flexRow, justifyContent: 'center' }}>
              <LoadingButton variant="contained" onClick={() => generateOrder('mobile')}
                loading={false}
              >
                Pay with mobile
              </LoadingButton>
              <LoadingButton variant="contained" onClick={() => generateOrder('nautilus')}
                loading={false}
              >
                Pay with Nautilus
              </LoadingButton>
            </Box>
          </Box>
        </DialogActions>
      </Collapse>
      <Collapse in={!!paymentWalletType} mountOnEnter unmountOnExit>
        <DialogContent sx={{ minWidth: '350px', maxWidth: !fullScreen ? '460px' : null }}>
          <ProcessPayment
            payment={order}
            paymentWalletType={paymentWalletType!}
            onTransactionSuccess={handleSubmitTx}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', alignItems: 'flex-end', p: 1 }}>
          <Button onClick={() => setPaymentWalletType(undefined)}>
            Go back
          </Button>
          <Button onClick={() => {
            setPaymentWalletType(undefined)
            setOpen(false)
          }}>
            Close
          </Button>
        </DialogActions>
      </Collapse>
    </Dialog>
  );
};

export default PayPaymentInstrumentDialog;