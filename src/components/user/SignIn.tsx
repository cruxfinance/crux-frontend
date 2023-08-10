import React, { FC, useEffect } from "react";
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
  ListItemButton
} from "@mui/material";
import { signIn } from "next-auth/react"; // Import signIn from next-auth

interface ISignIn {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const VESPR_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiIHZpZXdCb3g9IjAgMCA2NDAgNjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJyZ2JhKDksIDE0LCAyMiwgMSkiIHJ4PSIxMDAiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJtNDU1LjUxOCAxNzguMDQwOC0xMzUuMjQzNiAxODIuNzV2LS43Mzk2TDE4NC45NjIgMTc3LjE4MDhINzAuOTI2bDM1LjE3NCA0Ny41NThoMzMuOTE4NEwzMjAuMjA1NiA0NjIuMTE2di45NjMybDE4MC4yNTYtMjM3LjQ5NzZINTM0LjM4bDM1LjE3NC00Ny41NDA4SDQ1NS41MTh6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTMwMC45OTkgMTAyaC4wMDIiLz48L3N2Zz4='

export const SignIn: FC<ISignIn> = ({ open, setOpen, setLoading }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleClose = () => {
    setOpen(false)
  }

  const handleConnect = (walletName: string) => {
    setLoading(true)
    // walletContext.connect(walletName)
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
            fontWeight: "800",
            fontSize: "32px",
          }}
        >
          {/* {walletContext.connected ? "Wallet Connected" : "Connect Wallet"} */}
        </DialogTitle>
        <DialogContent sx={{ minWidth: '350px', pb: 0 }}>
          {/* {walletContext.connecting ? (
            <CircularProgress sx={{ ml: 2, color: "black" }} size={"1.2rem"} />
          ) : ( */}
          {(
            <List>
              {/* {wallets.map((wallet, i) => {
                if (wallet.icon === VESPR_ICON && i > 0) return null
                return (
                  <ListItemButton key={i} onClick={() => handleConnect(wallet.name)}>
                    <ListItemAvatar>
                      <Avatar
                        alt={
                          wallet.icon === VESPR_ICON ? 'Vespr Icon' : wallet.name + ' Icon'
                        }
                        src={wallet.icon}
                        sx={{ height: '24px', width: '24px' }}
                        variant="square"
                      />
                    </ListItemAvatar>
                    <ListItemText primary={
                      wallet.icon === VESPR_ICON ? 'Vespr' : wallet.name
                    } />
                  </ListItemButton>
                )
              })}*/}
              <ListItemButton onClick={() => handleProviderSignIn("github")}>
                <ListItemAvatar>
                  <Avatar alt="GitHub Icon" src="/path/to/github-icon.png" sx={{ height: "24px", width: "24px" }} variant="square" />
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
