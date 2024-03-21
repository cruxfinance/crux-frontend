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
  Skeleton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAlert } from '@contexts/AlertContext';
import { useWallet } from '@contexts/WalletContext';
import { trpc } from '@lib/trpc';
import { flexColumn, flexRow } from '@lib/flex';
import SelectWallets from './SelectWallets';
import AddWallet from '@components/user/wallet/AddWallet';
import { allowedTokens } from '@lib/configs/paymentTokens';
import { getErgoWalletContext } from "@contexts/WalletContext";
import { getPriceForProduct, productCosts } from '@lib/configs/productCosts';
import ProcessPayment from '@components/payments/ProcessPayment';
import { LoadingButton } from '@mui/lab';

interface IPayReportDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  taxYear: number;
  setSelectedReport: React.Dispatch<React.SetStateAction<TReport | undefined>>;
}

const PayReportDialog: FC<IPayReportDialogProps> = ({
  open,
  setOpen,
  taxYear,
  setSelectedReport
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

  useEffect(() => {
    const checkedPrices = getPriceForProduct('report', sessionData?.user.privilegeLevel && sessionData?.user.privilegeLevel !== "ADMIN" ? sessionData?.user.privilegeLevel : "DEFAULT", buttonChoice)
    setPrices(checkedPrices)
  }, [sessionData, buttonChoice])

  const checkPrepaidReports = trpc.accounting.checkPrepaidReports.useQuery(
    undefined,
    {
      enabled: sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
      retry: 0
    }
  )

  const buttonChoices = [
    {
      name: 'Ergo',
      slug: 'erg'
    },
    {
      name: 'SigUSD',
      slug: 'sigusd'
    },
    {
      name: 'Crux',
      slug: 'crux'
    },
    {
      name: `Prepaid (${checkPrepaidReports?.data?.prepaidReports.length} available)`,
      slug: 'prepaid'
    }
  ]

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

  // Toggle between prepaid buttons and pay with mobile/nautilus buttons
  // Two step process, allowing time for the animation to end so the buttons don't exist when the new one mounts
  const handleToggle = () => {
    // Start by hiding the current component, 
    setShowComponent(false);
  };
  const handleExited = () => {
    // Once the current component has fully exited, switch the toggle and show the next component
    setprepaidToggle(!prepaidToggle);
    setShowComponent(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const initPayment = trpc.accounting.initiateReportPayment.useMutation()
  const handleSubmitTx = async (txId: string) => {
    const init = await initPayment.mutateAsync({
      taxYear,
      wallets: walletsList,
      paymentAmounts: order,
      txId
    })
    if (init) {
      setSelectedReport(init.report)
    }
  }

  const [buttonLoading, setButtonLoading] = useState(false)
  const usePrepaidReport = trpc.accounting.usePrepaidReport.useMutation()
  const handleSubmitPrepaid = async () => {
    if (checkPrepaidReports.data?.prepaidReports[0].id) {
      setButtonLoading(true)
      try {
        const pay = await usePrepaidReport.mutateAsync({
          reportId: checkPrepaidReports.data?.prepaidReports[0].id,
          taxYear,
          wallets: walletsList
        })
        if (pay) {
          addAlert('success', `Report paid! You may now download your ${taxYear} report.`)
          setOpen(false);
        }
      } catch (e) {
        console.error(e)
      } finally {
        setButtonLoading(false)
      }
    }
    else addAlert('error', "You don't have any prepaid reports")
  }

  const price = () => {
    if (buttonChoice === 'prepaid') {
      return <>
        <Typography component="s">${prices.basePrice}</Typography> <Typography component="span">$0</Typography>
      </>
    }
    else if (prices.discountedPrice !== prices.basePrice) {
      return <>
        <Typography component="s">${prices.basePrice}</Typography> <Typography component="span">${prices.discountedPrice}</Typography>
      </>
    } else {
      return <>${prices.basePrice}</>
    }
  }

  const getTokenDetailsFromName = (name: string | null) => {
    return allowedTokens.filter(
      (token) => token.name.toLowerCase() === name)[0];
  };
  const [order, setOrder] = useState<TransferAmount[]>([])
  const [paymentWalletType, setPaymentWalletType] = useState<'nautilus' | 'mobile' | undefined>(undefined)
  const [tokenDetails, setTokenDetails] = useState<AllowedToken>()
  const tokenInfo = trpc.transaction.fetchTokenInfoWithPrice.useQuery({
    tokenId: tokenDetails?.id || "0000000000000000000000000000000000000000000000000000000000000000"
  })
  const generateOrder = (walletType: 'nautilus' | 'mobile') => {
    // console.log(prices.discountedPrice)
    // console.log(tokenInfo?.data?.priceInUsd)
    // console.log(tokenInfo)
    if (prices.discountedPrice && tokenInfo.data && tokenInfo.data.priceInUsd && tokenDetails) {
      setPaymentWalletType(walletType)
      const amount = prices.discountedPrice / tokenInfo.data.priceInUsd

      const numberTokens = Math.floor(amount * Math.pow(10, tokenDetails.decimals))
      setOrder([{
        tokenId: tokenDetails.id,
        amount: numberTokens
      }])
    }
  }

  const [priceLoading, setPriceLoading] = useState(false)
  useEffect(() => {
    setPriceLoading(true)
    const newTokenDetails = getTokenDetailsFromName(buttonChoice)
    setTokenDetails(newTokenDetails)
  }, [buttonChoice])

  useEffect(() => {
    if (buttonChoice === 'prepaid') {
      setPriceInCurrency('Free')
      setPriceLoading(false)
    }
    else if (prices.discountedPrice && tokenInfo.data && tokenInfo.data.priceInUsd) {
      const amount = (prices.discountedPrice / tokenInfo.data.priceInUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })
      setPriceInCurrency(`${amount} ${buttonChoices.find(item => item.slug === buttonChoice)?.name}`)
      setPriceLoading(false)
    }
  }, [JSON.stringify(tokenInfo.data), buttonChoice])

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
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: "800",
          fontSize: "32px",
        }}
      >
        Create {taxYear} Report
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
            This will create a downloadable {taxYear} tax report in CSV and Koinly format. <Typography component="span" sx={{ fontWeight: 700 }}>
              Reports are non-refundable.
            </Typography> Verify the year and included wallets before proceeding.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Select included wallets:
            </Typography>
            <SelectWallets
              checked={selectedWallets}
              setChecked={setSelectedWallets}
            />
            <AddWallet />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Typography sx={{ mb: 2 }}>Select payment method: </Typography>
            <Box sx={{ ...flexRow, flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
              {buttonChoices.filter(value => (
                value.slug === 'prepaid' && checkPrepaidReports.data && checkPrepaidReports.data.hasPrepaidReports)
                || value.slug !== 'prepaid'
              ).map((choice, index) => {
                const { slug, name } = choice
                return <Box key={slug}>
                  <Button
                    key={slug}
                    variant="text"
                    onClick={() => { // below logic just checks if we need to toggle between prepaid and mobile/nautilus buttons
                      if (
                        (slug === 'prepaid' && buttonChoice !== 'prepaid')
                        || (slug !== 'prepaid' && buttonChoice === 'prepaid')
                      ) {
                        handleToggle()
                        setButtonChoice(slug)
                      } else setButtonChoice(slug)
                    }}
                    sx={{
                      border: '1px solid rgba(120, 150, 150, 0.25)',
                      background: buttonChoice === slug ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
                      fontWeight: buttonChoice === slug ? '700' : 'inherit',
                      color: buttonChoice === slug ? 'primary.main' : 'inherit',
                      '&:hover': {
                        background: buttonChoice === slug ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
                      }
                    }}
                  >
                    {name === 'Crux' ? `${name} (30% Discount)` : name}
                  </Button>
                </Box>
              })}
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ ...flexColumn, alignItems: 'center', gap: 1 }}>
              <Typography>
                Total: {price()}
              </Typography>
              {priceLoading
                ? <Skeleton variant="text" sx={{ fontSize: '16px', width: '100px', textAlign: 'center' }} />
                : <Typography>
                  {priceInCurrency}
                </Typography>
              }
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', alignItems: 'flex-end', p: 1 }}>
          <Box sx={{ width: '100%' }}>
            <Grow in={!prepaidToggle && showComponent} timeout={{ exit: 50, enter: 200 }} onExited={handleExited} mountOnEnter unmountOnExit>
              <Box sx={{ ...flexRow, justifyContent: 'center' }}>
                <LoadingButton variant="contained" onClick={() => generateOrder('mobile')}
                  loading={!tokenInfo.data?.priceInUsd}
                >
                  Pay with mobile
                </LoadingButton>
                <LoadingButton variant="contained" onClick={() => generateOrder('nautilus')}
                  loading={!tokenInfo.data?.priceInUsd}
                >
                  Pay with Nautilus
                </LoadingButton>
              </Box>
            </Grow>
            <Grow in={prepaidToggle && showComponent} timeout={{ exit: 50, enter: 200 }} onExited={handleExited} mountOnEnter unmountOnExit>
              <Box sx={{ ...flexRow, justifyContent: 'center' }}>
                <LoadingButton loading={buttonLoading} variant="contained" onClick={handleSubmitPrepaid}>
                  Confirm
                </LoadingButton>
              </Box>
            </Grow>
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

export default PayReportDialog;