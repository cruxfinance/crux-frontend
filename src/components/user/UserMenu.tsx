import React, { FC, useState, useEffect } from 'react';
import {
  IconButton,
  Icon,
  useTheme,
  Avatar,
  Typography,
  Button
} from '@mui/material'
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
import SignIn from '@src/components/user/SignIn';
import { getShortAddress } from '@utils/general';
import { SxProps } from '@mui/system';
import { useSession } from 'next-auth/react';
import { trpc } from "@utils/trpc";
import { signIn, signOut } from "next-auth/react"

const WALLET_ADDRESS = "wallet_address_coinecta";
const WALLET_NAME = "wallet_name_coinecta";

interface IWalletType {
  name: string;
  icon: string;
  version: string;
}

interface IUserMenuProps {
}

const UserMenu: FC<IUserMenuProps> = () => {
  const theme = useTheme()
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false)
  // const walletContext = useWallet()
  // const connectedWalletAddress = useAddress();
  const [rewardAddress, setRewardAddress] = useState<string | undefined>(undefined);
  const result = trpc.user.getNonce.useQuery({ userAddress: rewardAddress }, { enabled: false, retry: false });
  const [newNonce, setNewNonce] = useState<string | undefined>(undefined)
  const [walletIcon, setWalletIcon] = useState<string | undefined>(undefined)
  // const walletList = useWalletList();
  const { data: sessionData, status: sessionStatus } = useSession();
  const [providerLoading, setProviderLoading] = useState(true)
  // const walletTypeQuery = trpc.user.getUserWalletType.useQuery({}, {
  //   enabled: sessionStatus === 'authenticated', // Only run the query if this is true
  // });

  useEffect(() => {
    if (sessionStatus === 'authenticated' || sessionStatus === 'unauthenticated') {
      setProviderLoading(false)
    }
    if (sessionStatus === 'authenticated' && sessionData.user.walletType) {
      // walletContext.connect(sessionData.user.walletType)

    }
  }, [sessionStatus, setProviderLoading])

  // useEffect(() => {
  //   console.log('wallet type query: ' + walletTypeQuery.data)
  //   console.log('session status: ' + sessionStatus)
  //   if (walletTypeQuery.data && !walletContext.connected) {
  //     // Connect to the user's Cardano wallet using the wallet type
  //     walletContext.connect(walletTypeQuery.data)
  //   }
  // }, [walletTypeQuery.data]); // Depend on the query's data

  // useEffect(() => {
  //   if (walletContext.connected) {
  //     async function getUserAddress() {
  //       const address = await walletContext.wallet.getRewardAddresses();
  //       const walletTypeObject: IWalletType[] = walletList.filter(item => item.name === walletContext.name);
  //       setWalletIcon(walletTypeObject[0].icon)
  //       // console.log('connected Wallet Address: ' + connectedWalletAddress)
  //       // console.log('got user address: ' + address[0])
  //       setRewardAddress(address[0]);
  //     }
  //     getUserAddress();
  //   }
  // }, [walletContext.connected]);

  // useEffect(() => {
  //   console.log('connected: ' + walletContext.connected)
  //   console.log('rewardAddress: ' + rewardAddress)
  //   if (rewardAddress && walletContext.connected && sessionStatus === 'unauthenticated') {
  //     result.refetch()
  //       .then((response: any) => {
  //         console.log(response)
  //       })
  //       .catch((error: any) => {
  //         console.error(error);
  //       });
  //     console.log('result refetched')
  //   }
  // }, [rewardAddress, sessionStatus]);

  // useEffect(() => {
  //   if (result?.data?.nonce !== null && result?.data?.nonce !== undefined && sessionStatus === 'unauthenticated') {
  //     setNewNonce(result.data.nonce)
  //   }
  // }, [result.data, sessionStatus])

  // useEffect(() => {
  //   if (newNonce && rewardAddress) {
  //     console.log('verifying ownership with nonce: ' + newNonce)
  //     if (sessionStatus === 'unauthenticated') {
  //       verifyOwnership(newNonce, rewardAddress)
  //     }
  //   }
  // }, [newNonce, sessionStatus])

  // const verifyOwnership = (nonce: string, address: string) => {
  //   setProviderLoading(true)
  //   console.log('nonce: ' + nonce)
  //   console.log('address: ' + address)
  //   walletContext.wallet.signData(address, nonce)
  //     .then((signature: { key: string; signature: string; }) => {
  //       console.log(signature)
  //       return signIn("credentials", {
  //         nonce,
  //         rewardAddress: rewardAddress,
  //         signature: JSON.stringify(signature),
  //         wallet: JSON.stringify({
  //           type: walletContext.name,
  //           rewardAddress,
  //           address: connectedWalletAddress,
  //           icon: walletIcon
  //         }),
  //         redirect: false
  //       });
  //     })
  //     .then((response: any) => {
  //       if (response.status !== 200 || !response.status) {
  //         console.log('disconnect')
  //         setRewardAddress(undefined)
  //         walletContext.disconnect()
  //       }
  //       console.log(response)
  //       setProviderLoading(false)
  //     })
  //     .catch((error: any) => {
  //       console.log('disconnect')
  //       setRewardAddress(undefined)
  //       walletContext.disconnect()
  //       console.error(error);
  //       setProviderLoading(false)
  //     });
  // }

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const clearWallet = async () => {
    localStorage.setItem(WALLET_ADDRESS, '');
    localStorage.setItem(WALLET_NAME, '');
    setRewardAddress(undefined)
    // walletContext.disconnect()
    signOut()
  };

  return (
    <>
      {(sessionStatus === 'unauthenticated' || sessionStatus === 'loading') && (
        <Button
          onClick={() => setModalOpen(true)}
          variant="contained"
          // disabled={providerLoading}
          sx={{ my: '5px' }}
          disabled
        >
          {providerLoading ? 'Loading...' : 'Sign in'}
        </Button>
      )}
      {sessionStatus === 'authenticated' && (
        <>
          {sessionData.user.walletType}
          <IconButton
            sx={{
              color: theme.palette.text.primary,


            }}
            onClick={handleClick}
          >
            <Avatar src={sessionData.user.image} sx={{ width: '24px', height: '24px', mr: 1 }} variant="square" />
            {/* {connectedWalletAddress &&
              <Typography>
                {getShortAddress(connectedWalletAddress)}
              </Typography>
            } */}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            slotProps={{
              paper: {
                elevation: 1,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  minWidth: '230px',
                  mt: 0,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 15,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem
              sx={{ mt: '6px' }}
            // onClick={() => router.push('/users/' + walletContext.wallet.getChangeAddress)}
            >
              <Avatar /> View Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => router.push('/user-settings/')}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Edit Profile
            </MenuItem>
            <MenuItem onClick={() => setModalOpen(true)}>
              <ListItemIcon>
                <AccountBalanceWalletIcon fontSize="small" />
              </ListItemIcon>
              Change Wallet
            </MenuItem>
            <MenuItem onClick={() => clearWallet()}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </>
      )}
      <SignIn open={modalOpen} setOpen={setModalOpen} setLoading={setProviderLoading} />
    </>
  );
}

export default UserMenu;