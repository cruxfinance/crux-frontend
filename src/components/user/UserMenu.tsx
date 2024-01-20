import React, { FC, useState, useEffect } from "react";
import { Typography, Button, Box } from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Logout from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SignIn from "./SignIn";
import { getShortAddress } from "@lib/utils/general";
import { signIn, signOut } from "next-auth/react";
import { useWallet } from "@contexts/WalletContext";
import Link from "next/link";
import SettingsIcon from "@mui/icons-material/Settings";
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';

interface IUserMenuProps { }

const UserMenu: FC<IUserMenuProps> = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [addWalletModal, setAddWalletModal] = useState(false);
  const {
    wallet,
    setWallet,
    sessionData,
    sessionStatus,
    providerLoading,
    setProviderLoading,
  } = useWallet();

  useEffect(() => {
    // console.log('session: ' + sessionStatus);
    if (
      sessionStatus === "authenticated" ||
      sessionStatus === "unauthenticated"
    ) {
      setProviderLoading(false);
    }

    // if (sessionStatus === 'authenticated' && sessionData?.user.walletType === 'nautilus') {
    //   const checkDappConnection = async () => {
    //     const isNautilusConnected = await window.ergoConnector.nautilus.connect();
    //     if (isNautilusConnected) {
    //       // console.log('Nautilus is connected')

    //       // @ts-ignore
    //       const changeAddress = await ergo.get_change_address();
    //       // @ts-ignore
    //       const usedAddresses = await ergo.get_used_addresses();
    //       // @ts-ignore
    //       const unusedAddresses = await ergo.get_unused_addresses();
    //       const addressArray = [changeAddress, ...usedAddresses, ...unusedAddresses]

    //       if (addressArray.includes(sessionData.user.address)) {
    //         setDAppWallet({
    //           connected: true,
    //           name: 'nautilus',
    //           addresses: addressArray
    //         })
    //       }
    //       else {
    //         // Notify they chose the wrong wallet
    //         // Allow them to choose the correct one or log out
    //         // signOut()
    //       }
    //     }
    //     // else signOut()
    //   }
    //   checkDappConnection();
    // }

    // if (sessionStatus === 'authenticated' && !sessionData.user.address) {
    //   console.log('User neeeds to add an address')
    //   setAddWalletModal(true)
    // }
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
    window?.ergoConnector?.nautilus.disconnect();
    signOut();
  };

  const handleAddWalletClose = () => {
    if (sessionStatus === "authenticated" && sessionData?.user.address) {
      setAddWalletModal(false);
    }
  };

  useEffect(() => {
    if (!addWalletModal) {
      handleAddWalletClose();
    }
  }, [addWalletModal]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && !sessionData?.user.address) {
      setAddWalletModal(true);
      setWallet("");
    }
    if (sessionStatus === "authenticated" && sessionData?.user.address) {
      setAddWalletModal(false);
      setWallet(sessionData.user.address);
    }
  }, [sessionStatus, sessionData?.user.address]);

  return (
    <>
      {/* {dappConnected ? 'connected to dapp' : 'not connected to dapp'} */}
      {(sessionStatus === "unauthenticated" || sessionStatus === "loading") && (
        <Button
          onClick={() => setModalOpen(true)}
          variant="contained"
          disabled={providerLoading}
          sx={{ my: "5px" }}
        // disabled
        >
          {providerLoading ? "Loading..." : "Sign In"}
        </Button>
      )}
      {sessionStatus === "authenticated" && (
        <>
          {/* {sessionData.user.walletType} */}
          <Button
            sx={walletButtonSx}
            variant="contained"
            disabled={providerLoading}
            onClick={(e) => handleClick(e)}
          >
            {/* <Avatar src={sessionData.user.image} sx={{ width: '24px', height: '24px', mr: 1 }} variant="square" /> */}
            <Typography>
              {providerLoading
                ? "Loading..."
                : wallet
                  ? getShortAddress(wallet)
                  : "No wallet"}
            </Typography>
          </Button>
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
                  overflow: "visible",
                  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                  minWidth: "230px",
                  mt: 0,
                  pt: 1,
                  "& .MuiAvatar-root": {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  "&:before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    top: 0,
                    right: 15,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translateY(-50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {/* <MenuItem
              sx={{ mt: '6px' }}
            // onClick={() => router.push('/users/' + walletContext.wallet.getChangeAddress)}
            >
              <Avatar src={sessionData?.user.image} variant="rounded" /> View Profile
            </MenuItem>
            <Divider /> */}
            {/* <MenuItem onClick={() => router.push('/user-settings/')}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Edit Profile
            </MenuItem> */}
            {/* <Box sx={{ "&:hover a": { textDecoration: "none!important" } }}>
              <Link href="/user/connected-wallets" passHref>
                <MenuItem>
                  <ListItemIcon>
                    <AccountBalanceWalletIcon fontSize="small" />
                  </ListItemIcon>
                  Connected wallets
                </MenuItem>
              </Link>
            </Box> */}
            <Box sx={{ "&:hover a": { textDecoration: "none!important" } }}>
              <Link href="/user/subscriptions" passHref>
                <MenuItem>
                  <ListItemIcon>
                    <SubscriptionsIcon fontSize="small" />
                  </ListItemIcon>
                  Subscriptions
                </MenuItem>
              </Link>
            </Box>
            <MenuItem onClick={clearWallet}>
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
};

export default UserMenu;

const walletButtonSx = {
  color: "#fff",
  fontSize: "1rem",
  px: "1.2rem",
  textTransform: "none",
  "&:hover": {
    backgroundColor: "#4BD0C9",
    boxShadow: "none",
  },
  "&:active": {
    backgroundColor: "rgba(49, 151, 149, 0.25)",
  },
  textOverflow: "ellipsis",
  maxWidth: "10em",
  overflow: "hidden",
  whiteSpace: "nowrap",
};
