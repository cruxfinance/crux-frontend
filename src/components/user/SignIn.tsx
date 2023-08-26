import React, { FC, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  useTheme,
  useMediaQuery,
  List,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box
} from "@mui/material";
import { signIn } from "next-auth/react"; // Import signIn from next-auth
import nautilusIcon from "@public/icons/nautilus.png";
import githubIcon from "@public/icons/github-mark-white.png";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface ISignIn {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SignIn: FC<ISignIn> = ({ open, setOpen, setLoading }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [isNautilusAvailable, setNautilusAvailable] = useState(false);

  useEffect(() => {
    setNautilusAvailable(!!window.ergoConnector?.nautilus);
  }, []);

  const handleClose = () => {
    setOpen(false)
  }

  const handleConnect = (walletName: string) => {
    setLoading(true)
    window.ergoConnector[walletName].connect()
    handleClose()
  }

  const handleProviderSignIn = (providerId: string) => {
    setLoading(true);
    handleClose();

    signIn(providerId)
      .then((result) => {
        console.log(result)
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={fullScreen}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            // fontWeight: "800",
            fontSize: "32px",
          }}
        >
          Choose a provider
        </DialogTitle>
        <DialogContent sx={{ minWidth: '250px', pb: 0 }}>
          <Box sx={{ mb: 2 }}>
            <Accordion sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', background: 'rgba(150,150,150,0.03)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                New users: read this first
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ mb: 2 }}>
                  The auth provider you select will be your login on all devices. If you choose to create your account with an Ergo wallet, please make sure you have access to it on all devices.
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  It is OK to login with Nautilus on desktop and mobile wallet on your phone, as long as you have the same address available on both devices.
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  You may add multiple wallets to your account with Premium membership, but the one you select now will be your master login.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>

          {(
            <List>
              {isNautilusAvailable && (
                <ListItemButton onClick={() => handleConnect('nautilus')}>
                  <ListItemAvatar>
                    <Avatar
                      alt='Nautilus wallet icon'
                      src={nautilusIcon.src}
                      sx={{ height: '24px', width: '24px' }}
                      variant="square"
                    />
                  </ListItemAvatar>
                  <ListItemText primary="Nautilus wallet" />
                </ListItemButton>
              )}
              <ListItemButton onClick={() => handleProviderSignIn("github")}>
                <ListItemAvatar>
                  <Avatar alt="GitHub Icon" src={githubIcon.src} sx={{ height: "24px", width: "24px" }} variant="square" />
                </ListItemAvatar>
                <ListItemText primary="GitHub" />
              </ListItemButton>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {/* <Button onClick={handleClose}>Close Window</Button>
          {walletContext.connected && (
            <Button
              onClick={() => walletContext.disconnect()}
            >
              Disconnect
            </Button>
          )} */}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SignIn;
