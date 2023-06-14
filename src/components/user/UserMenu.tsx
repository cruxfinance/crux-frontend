import React, { FC, useState } from 'react';
import {
  IconButton,
  useTheme,
  Avatar
} from '@mui/material'
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
// import RedeemIcon from '@mui/icons-material/Redeem';
import SellIcon from '@mui/icons-material/Sell';
import EditIcon from '@mui/icons-material/Edit';
import LoginIcon from '@mui/icons-material/Login';

interface IUserMenuProps {

}

const UserMenu: FC<IUserMenuProps> = ({ }) => {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loggedIn, setLoggedIn] = useState(false)
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {loggedIn ? (
        <>
          <IconButton onClick={handleClick} sx={{ padding: 0 }}>
            <Avatar sx={{ width: 27, height: 27 }} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
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
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem
              sx={{ mt: '6px' }}
            // onClick={() => router.push('/users/' + walletAddress)}
            >
              <Avatar /> View Profile
            </MenuItem>
            <Divider />
            <MenuItem
            // onClick={() => router.push('/sell')}
            >
              <ListItemIcon>
                <SellIcon fontSize="small" />
              </ListItemIcon>
              Transactions
            </MenuItem>
            <MenuItem
            // onClick={() => router.push('/manage-sales')}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              Sales
            </MenuItem>
            <MenuItem
            // onClick={() => router.push('/user-settings/')}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Edit Profile
            </MenuItem>
            <MenuItem
            //onClick={() => setAddWalletModalOpen(true)}
            >
              <ListItemIcon>
                <AccountBalanceWalletIcon fontSize="small" />
              </ListItemIcon>
              Change Wallet
            </MenuItem>
            <MenuItem
              onClick={() => setLoggedIn(false)}
            >
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </>
      ) : (

        <IconButton
          sx={{ p: 0 }}
          disabled
          onClick={() => setLoggedIn(true)}
        >
          <LoginIcon />
        </IconButton>

      )}
    </>
  );
};

export default UserMenu;