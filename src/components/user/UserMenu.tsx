import React, { FC, useState, useEffect, useContext } from 'react';
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
import nautilusIcon from "@public/icons/nautilus.png";

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
  const { data: sessionData, status: sessionStatus } = useSession();
  const [providerLoading, setProviderLoading] = useState(true)

  useEffect(() => {
    console.log('session: ' + sessionStatus);
    if (sessionStatus === 'authenticated' || sessionStatus === 'unauthenticated') {
      setProviderLoading(false);
    }

    if (sessionStatus === 'authenticated' && sessionData.user.walletType === 'nautilus') {
      const checkDappConnection = async () => {
        const isNautilusConnected = await window.ergoConnector.nautilus.isConnected();
        if (!isNautilusConnected) {
          console.log('Nautilus not connected')
          // Add flow for when user is authenticated but nautilus was disconnected manually in the dapp
          // 1. Ask user to connect to nautilus
          // 2. Verify they chose a wallet with an address that matches the authenticated user
          // 3. If not, ask them to a choose another wallet. Allow them to Log out and try again

          // Or
          // 1. Sign them out automatically
          signOut()
        }
      }
      checkDappConnection();
    }
  }, [sessionStatus, setProviderLoading]);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const clearWallet = async () => {
    window.ergoConnector.nautilus.disconnect();
    signOut()
  };

  return (
    <>
      {/* {dappConnected ? 'connected to dapp' : 'not connected to dapp'} */}
      {(sessionStatus === 'unauthenticated' || sessionStatus === 'loading') && (
        <Button
          onClick={() => setModalOpen(true)}
          variant="contained"
          disabled={providerLoading || !router.pathname.includes('hello')}
          sx={{ my: '5px' }}
        // disabled
        >
          {providerLoading ? 'Loading...' : 'Sign in'}
        </Button>
      )}
      {sessionStatus === 'authenticated' && (
        <>
          {/* {sessionData.user.walletType} */}
          <IconButton
            sx={{
              color: theme.palette.text.primary,
            }}
            onClick={handleClick}
          >
            <Avatar src={sessionData.user.image} sx={{ width: '24px', height: '24px', mr: 1 }} variant="square" />
            {sessionData.user.address &&
              <Typography>
                {getShortAddress(sessionData.user.address)}
              </Typography>
            }
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
      <SignIn
        open={modalOpen}
        setOpen={setModalOpen}
        setLoading={setProviderLoading}
      // setDappConnected={setDappConnected}
      // connectDapp={dappConnection}
      />
    </>
  );
}

export default UserMenu;