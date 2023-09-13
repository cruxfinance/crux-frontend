import React, { useEffect, useState, FC } from 'react'
import { z } from 'zod';
import QRCode from 'react-qr-code';
import {
  Box,
  Button,
  CircularProgress,
  Input,
  LinearProgress,
  Typography,
  useTheme
} from '@mui/material';
import Link from '@components/Link';
import { WalletContext } from '@contexts/WalletContext';
import { useRouter } from 'next/router';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RedeemIcon from '@mui/icons-material/Redeem';
import SellIcon from '@mui/icons-material/Sell';
import EditIcon from '@mui/icons-material/Edit';
import SignIn, { Expanded } from '@components/user/SignIn';
import { getShortAddress } from '@utils/general';
import { SxProps } from '@mui/system';
import { useSession } from 'next-auth/react';
import { trpc } from "@utils/trpc";
import { signIn, signOut } from "next-auth/react"
import nautilusIcon from "@public/icons/nautilus.png";

interface INautilusLogin {
  expanded: Expanded
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  localLoading: boolean;
  setLocalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  dappConnected: boolean;
  setDappConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NautilusLogin: FC<INautilusLogin> = ({ setLoading, localLoading, setLocalLoading, setModalOpen, dappConnected, setDappConnected }) => {
  const theme = useTheme()
  const [defaultAddress, setDefaultAddress] = useState<string | undefined>(undefined);
  const getNonce = trpc.user.getNonce.useQuery({ userAddress: defaultAddress }, { enabled: false, retry: false });
  const [newNonce, setNewNonce] = useState<string | undefined>(undefined)
  const { data: sessionData, status: sessionStatus } = useSession();

  useEffect(() => {
    if (defaultAddress && dappConnected && sessionStatus === 'unauthenticated') {
      refetchData()
    }
    else if (dappConnected && !defaultAddress) getAddress()
  }, [defaultAddress, dappConnected, sessionStatus]);

  const getAddress = async () => {
    try {
      // @ts-ignore
      const changeAddress = await ergo.get_change_address();
      if (changeAddress) {
        setDefaultAddress(changeAddress);
      }
    } catch {
      setLocalLoading(false)
      console.error('Error fetching wallet address')
    }
  }

  // get the new nonce
  const refetchData = () => {
    getNonce.refetch()
      .then((response: any) => {
        console.log('set new nonce')
      })
      .catch((error: any) => {
        console.error(error);
        setLocalLoading(false)
      });
  }

  useEffect(() => {
    if (getNonce?.data?.nonce !== null && getNonce?.data?.nonce !== undefined && sessionStatus === 'unauthenticated') {
      setNewNonce(getNonce.data.nonce)
    }
  }, [getNonce.data, sessionStatus])

  useEffect(() => {
    if (newNonce && defaultAddress) {
      // console.log('verifying ownership with nonce: ' + newNonce)
      if (sessionStatus === 'unauthenticated') {
        verifyOwnership(newNonce, defaultAddress)
      }
    }
  }, [newNonce, sessionStatus])

  const verifyOwnership = async (nonce: string, address: string) => {
    try {
      setLoading(true);
      // console.log('nonce: ' + nonce);
      // console.log('address: ' + address);
      // @ts-ignore
      const signature = await ergo.auth(address, nonce);
      // console.log(signature);
      if (signature) {
        const response = await signIn("credentials", {
          nonce,
          defaultAddress: defaultAddress,
          signature: JSON.stringify(signature),
          wallet: JSON.stringify({
            type: 'nautilus',
            defaultAddress: defaultAddress,
            address: defaultAddress,
            icon: nautilusIcon
          }),
          redirect: false
        });
        if (!response?.status || response.status !== 200) {
          setDefaultAddress(undefined);
          setDappConnected(false)
          window.ergoConnector.nautilus.disconnect();
        }
        console.log(response);
      }
    } catch (error) {
      console.log('disconnect');
      setDefaultAddress(undefined);
      setDappConnected(false)
      window.ergoConnector.nautilus.disconnect();
      console.error(error);
    } finally {
      setLoading(false);
      setLocalLoading(false)
      setModalOpen(false)
    }
  };

  return (
    <>
      {/* {props.dAppWallet.connected && isAddressValid(props.wallet) ? (
        <>
          <Typography sx={{ mb: "1rem", fontSize: ".9rem" }}>
            Select which address you want to use as as the default.
          </Typography>
          <TextField
            label="Default Wallet Address"
            fullWidth
            value={props.wallet}
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {props.wallet !== "" && <CheckCircleIcon color="success" />}
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              // width: "100%",
              border: "1px solid",
              borderColor: theme.palette.background.default,
              borderRadius: ".3rem",
              mt: "1rem",
              maxHeight: "12rem",
              overflowY: "auto",
            }}
          >
            {props.dAppWallet.name !== undefined && props.dAppWallet.addresses.map((address: string, i: number) => {
              return (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: 'space-between',
                    alignItems: "center",
                    // width: "100%",
                    fontSize: ".7rem",
                    pl: ".5rem",
                    mt: ".5rem",
                    pb: ".5rem",
                    borderBottom: i === props.dAppWallet.addresses.length - 1 ? 0 : "1px solid",
                    borderBottomColor: theme.palette.background.default,
                  }}
                  key={i}
                >
                  <Box sx={{
                    maxWidth: '60vw',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {address}
                  </Box>
                  <Box>
                    <Button
                      sx={{ ml: "auto", mr: ".5rem" }}
                      variant="contained"
                      color={props.wallet === address ? "success" : "primary"}
                      size="small"
                      onClick={() => props.changeWallet(address)}
                    >
                      {props.wallet === address ? "Active" : "Choose"}
                    </Button>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </>
      ) : ( */}
      {/* <Button onClick={() => dappConnection()}>Start</Button> */}
      {localLoading &&
        <Box>
          <Typography sx={{ mb: 1, textAlign: 'center' }}>
            Please follow the prompts on Nautilus
          </Typography>
          <LinearProgress />
        </Box>
      }
      {/* )} */}
    </>
  );
}

export default NautilusLogin;