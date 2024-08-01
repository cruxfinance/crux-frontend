import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useWallet } from '@contexts/WalletContext';

interface NotSubscribedNotifyDialogProps {
}

const NotSubscribedNotifyDialog: React.FC<NotSubscribedNotifyDialogProps> = () => {
  const router = useRouter()
  const {
    sessionData,
    sessionStatus,
    setAddWalletModalOpen,
    notSubscribedNotifyDialogOpen,
    setNotSubscribedNotifyDialogOpen
  } = useWallet();
  const isSubscriber = sessionData?.user.privilegeLevel === "BASIC" || sessionData?.user.privilegeLevel === "PRO" || sessionData?.user.privilegeLevel === "ADMIN";
  const isLoggedIn = sessionStatus === "authenticated";

  const onClose = () => {
    setNotSubscribedNotifyDialogOpen(false)
  }

  const onLoginClick = () => {
    setNotSubscribedNotifyDialogOpen(false)
    setAddWalletModalOpen(true)
  }

  const onSubscribeClick = () => {
    setNotSubscribedNotifyDialogOpen(false)
    router.push('/user/subscription')
  }

  // const onLearnMoreClick = () => {
  //   setNotSubscribedNotifyDialogOpen(false)
  //   console.log("we need a learn more page")
  // }

  return (
    <Dialog open={notSubscribedNotifyDialogOpen} onClose={onClose}>
      <DialogTitle>Premium Feature</DialogTitle>
      <DialogContent>
        <Typography>
          This is a premium feature. Subscribe to access.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center' }}>
        {/* <Button onClick={onLearnMoreClick} variant="contained">
          Learn More
        </Button> */}
        {!isLoggedIn && (
          <Button onClick={onLoginClick} variant="contained">
            Login First
          </Button>
        )}
        {isLoggedIn && !isSubscriber && (
          <Button onClick={onSubscribeClick} variant="contained">
            Subscribe Now
          </Button>
        )}
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotSubscribedNotifyDialog;