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
  Avatar,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Collapse,
  IconButton,
} from "@mui/material";
import { signIn } from "next-auth/react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MobileLogin from "./MobileLogin";
import NautilusLogin from "./NautilusLogin";
import CloseIcon from "@mui/icons-material/Close";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

const wallets: {
  name: Expanded;
  icon: string;
  description: string;
}[] = [
  {
    name: "Nautilus",
    icon: "/icons/wallets/nautilus-128.png",
    description: "Connect automatically signing with your wallet",
  },
  {
    name: "Mobile",
    icon: "/icons/wallets/mobile.webp",
    description: "Enter your wallet address then sign with the mobile app",
  },
];

export type Expanded = "Nautilus" | "Mobile" | "GitHub" | undefined;

interface ISignIn {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SignIn: FC<ISignIn> = ({ open, setOpen, setLoading }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [isNautilusAvailable, setNautilusAvailable] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(undefined);

  useEffect(() => {
    setNautilusAvailable(!!window.ergoConnector?.nautilus);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  // const handleConnect = async (walletName: string) => {
  //   // setLoading(true)
  //   window.ergoConnector.nautilus.disconnect()
  //   const connected = await window.ergoConnector.nautilus.connect()
  //   // console.log(connected)
  //   // setDappConnected(true)
  //   // connectDapp()
  // }

  const handleProviderSignIn = (providerId: string) => {
    setLoading(true);
    signIn(providerId)
      .then((result) => {
        // console.log(result)
      })
      .catch((error) => {
        console.error(error);
      });
    handleClose();
  };

  const handleWalletChange = (wallet: Expanded) => {
    setExpanded(wallet !== undefined ? wallet : undefined);
    if (wallet === "GitHub") handleProviderSignIn("github");
    if (wallet === "Nautilus") dappConnection();
  };

  const [nautilusLoading, setNautilusLoading] = useState(false);
  const [dappConnected, setDappConnected] = useState(false);
  const dappConnection = async () => {
    setNautilusLoading(true);
    try {
      const connect = await window.ergoConnector.nautilus.connect();
      if (connect) {
        setDappConnected(true);
      } else {
        console.log("error connecting nautilus");
        setNautilusLoading(false);
        setExpanded(undefined);
      }
    } catch (error) {
      console.error("Error connecting to dApp:", error);
      setNautilusLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={fullScreen}
        sx={{ zIndex: 12000 }}
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
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon sx={{ fontSize: 30 }} />
        </IconButton>
        <DialogContent sx={{ minWidth: "250px", pb: 0 }}>
          <Box sx={{ mb: 2 }}>
            <Accordion
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                background: "rgba(150,150,150,0.03)",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                New Users: Read this first
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ mb: 2 }}>
                  You may add multiple supported login wallets to your account.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
          {wallets.map((item, i) => {
            return (
              <Collapse
                in={expanded === item.name || expanded === undefined}
                mountOnEnter
                unmountOnExit
                key={i}
              >
                <Button
                  fullWidth
                  // disabled={walletAddress != ""}
                  sx={{
                    borderRadius: "6px",
                    p: "0.5rem",
                    justifyContent: "space-between",
                    mb: "12px",
                    display: "flex",
                    minWidth: fullScreen ? "90vw" : "500px",
                  }}
                  onClick={
                    expanded === undefined
                      ? () => handleWalletChange(item.name)
                      : () => handleWalletChange(undefined)
                  }
                >
                  <Box
                    sx={{
                      fontSize: "1.2rem",
                      color: "text.primary",
                      fontWeight: "400",
                      textAlign: "left",
                      display: "flex",
                    }}
                  >
                    <Avatar
                      src={item.icon}
                      // variant="circular"
                      sx={{
                        height: "3rem",
                        width: "3rem",
                        mr: "1rem",
                      }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: "400",
                          textTransform: "none",
                        }}
                      >
                        {item.name === "Mobile"
                          ? "Terminus/Mobile Wallet"
                          : item.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: ".9rem",
                          color: "text.secondary",
                          fontWeight: "400",
                          textTransform: "none",
                        }}
                      >
                        {item.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      transform:
                        expanded === item.name
                          ? "rotate(0deg)"
                          : "rotate(-90deg)",
                      transition: "transform 100ms ease-in-out",
                      textAlign: "right",
                      lineHeight: "0",
                      mr: "-0.5rem",
                    }}
                  >
                    <ExpandMoreIcon />
                  </Box>
                </Button>
              </Collapse>
            );
          })}
          <Collapse in={expanded === "Mobile"} mountOnEnter unmountOnExit>
            <MobileLogin setModalOpen={setOpen} />
          </Collapse>
          {isNautilusAvailable && (
            <Collapse in={expanded === "Nautilus"} mountOnEnter unmountOnExit>
              <NautilusLogin
                setLoading={setLoading}
                expanded={expanded}
                setExpanded={setExpanded}
                dappConnected={dappConnected}
                setDappConnected={setDappConnected}
                localLoading={nautilusLoading}
                setLocalLoading={setNautilusLoading}
                setModalOpen={setOpen}
                dappConnection={dappConnection}
              />
            </Collapse>
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
