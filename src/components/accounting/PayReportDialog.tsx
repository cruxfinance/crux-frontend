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
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAlert } from '@contexts/AlertContext';
import { useWallet } from '@contexts/WalletContext';
import { trpc } from '@lib/trpc';
import { TransitionGroup } from 'react-transition-group';
import { flexRow } from '@lib/flex';

interface IPayReportDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  taxYear: number;
}

const PayReportDialog: FC<IPayReportDialogProps> = ({
  open,
  setOpen,
  taxYear
}) => {
  const theme = useTheme();
  const { addAlert } = useAlert()
  const { sessionStatus } = useWallet()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [prepaidToggle, setprepaidToggle] = useState(false)
  const [showComponent, setShowComponent] = useState(true); // New state to manage visibility

  const handleToggle = () => { // toggle between prepaid buttons and pay with mobile/nautilus buttons
    // Start by hiding the current component
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

  const handleSubmit = async () => {
    console.log('submitted')
  }

  const checkPrepaidReports = trpc.accounting.checkPrepaidReports.useQuery(
    undefined,
    {
      enabled: sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
      retry: 0
    }
  )

  const usePrepaidReport = trpc.accounting.usePrepaidReport.useMutation()
  const handleSubmitPrepaid = async () => {
    if (checkPrepaidReports.data?.prepaidReports[0].id) {
      try {
        const pay = await usePrepaidReport.mutateAsync({ reportId: checkPrepaidReports.data?.prepaidReports[0].id, taxYear })
        if (pay) {
          addAlert('success', `Report paid! You may now download your ${taxYear} report.`)
          setOpen(false);
        }
      } catch (e) {
        console.error(e)
      }
    }
    else addAlert('error', "You don't have any prepaid reports")
  }

  const [buttonChoice, setButtonChoice] = useState('crux')
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
      name: 'Crux (30% Discount)',
      slug: 'crux'
    },
    {
      name: `Prepaid (${checkPrepaidReports?.data?.prepaidReports.length} available)`,
      slug: 'prepaid'
    }
  ]

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
      <DialogContent sx={{ minWidth: '350px', maxWidth: !fullScreen ? '460px' : null }}>
        <Typography sx={{ mb: 2 }}>
          This will create a downloadable {taxYear} tax report in CSV and Koinly format. <Typography component="span" sx={{ fontWeight: 700 }}>
            Reports are non-refundable.
          </Typography> Verify the year and included wallets before proceeding.
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Typography sx={{ mb: 2 }}>Select payment method: </Typography>
          <Box sx={{ ...flexRow, flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
            {buttonChoices.filter(value => (
              value.slug === 'prepaid' && checkPrepaidReports.data && checkPrepaidReports.data.hasPrepaidReports)
              || value.slug !== 'prepaid'
            ).map((choice, index) => {
              const { slug, name } = choice
              return <Box>
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
                  {name}
                </Button>
              </Box>
            })}
          </Box></Paper>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography>
            Select included wallets:
          </Typography>

        </Paper>
        <Box sx={{ mb: 2 }}>
          <Grow in={!prepaidToggle && showComponent} timeout={{ exit: 50, enter: 200 }} onExited={handleExited} mountOnEnter unmountOnExit>
            <Box sx={{ ...flexRow, justifyContent: 'center' }}>
              <Button variant="contained" onClick={handleSubmit}>
                Pay with mobile
              </Button>
              <Button variant="contained" onClick={handleSubmit}>
                Pay with Nautilus
              </Button>
            </Box>
          </Grow>
          <Grow in={prepaidToggle && showComponent} timeout={{ exit: 50, enter: 200 }} onExited={handleExited} mountOnEnter unmountOnExit>
            <Box sx={{ ...flexRow, justifyContent: 'center' }}>
              <Button variant="contained" onClick={handleSubmitPrepaid}>
                Confirm
              </Button>
            </Box>
          </Grow>
        </Box>
      </DialogContent>

    </Dialog>
  );
};

export default PayReportDialog;