import React, { FC, useState, useEffect, useRef } from 'react';
import {
  IconButton,
  useTheme,
  Typography,
  Box,
  Button,
  Grid,
  Badge,
  Popover,
  MenuList,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  Dialog,
  Avatar,
  Fade
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import Link from '@mui/material/Link';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface IMenuItemProps {
  icon: React.ReactElement;
  txType: string;
  txId: string;
  success: string;
  time: string;
  unread: boolean;
  index: number;
}

interface IImportMenuItem {
  txType: string;
  txId: string;
  success: string;
  time: string;
  unread: boolean;
}

interface INotificationsProps {
  dialogOpen: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDialogOpen: Function;
  handleDialogClose: Function;
}

const NotificationsMenu: FC<INotificationsProps> = ({ dialogOpen, setDialogOpen, handleDialogOpen, handleDialogClose }) => {
  const theme = useTheme()

  // const router = useRouter();
  // const {
  //   walletAddress,
  //   setWalletAddress,
  //   dAppWallet,
  //   setDAppWallet,
  //   addWalletModalOpen,
  //   setAddWalletModalOpen
  // } = useContext(WalletContext);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'notification-menu' : undefined;

  const [currentMenuItems, setCurrentMenuItems] = useState<IImportMenuItem[]>(sampleMenuItems)
  const [numberUnread, setNumberUnread] = useState(0)

  useEffect(() => {
    const array = currentMenuItems.filter((item) => item.unread === true)
    setNumberUnread(array.length)
  }, [currentMenuItems])

  const setRead = (i: number) => {
    setCurrentMenuItems((prevArray) => {
      const newArray = prevArray.map((item, index) => {
        if (index === i) {
          return {
            ...item,
            unread: !prevArray[index].unread
          }
        }
        return item
      })
      return newArray
    })
  }

  const markAllRead = () => {
    setCurrentMenuItems((prevArray) => {
      const newArray = prevArray.map((item) => {
        return {
          ...item,
          unread: false
        }
      })
      return newArray
    })
  }

  const isLg = useMediaQuery('(min-width:534px)')

  const CustomMenuItem: FC<IMenuItemProps> = ({ icon, txType, txId, success, time, unread, index }) => {
    return (
      <MenuItem
        onClick={() => setRead(index)}
        sx={{
          background: unread ? '#161a25' : 'none',
          '&:hover': {
            background: unread ? '#212737' : '#212737',
          }
        }}
      >
        <ListItemIcon>
          {icon}
        </ListItemIcon>
        <Grid container direction="column" sx={{ whiteSpace: 'normal' }}>
          <Grid item>
            {txType + ' '}
            <Link href={'https://explorer.ergoplatform.com/en/transactions/' + txId}>{txId}</Link>
            {' '}
            {success}
          </Grid>
          <Grid item sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
            {time + ' ago'}
          </Grid>
        </Grid>
        <ListItemIcon>
          <FiberManualRecordIcon
            sx={{
              fontSize: '12px',
              ml: '18px',
              color: unread ? theme.palette.text.primary : 'rgba(0,0,0,0)'
            }}
          />
        </ListItemIcon>
      </MenuItem>
    )
  }

  const Contents: FC = () => {
    const heightOneRef = useRef<HTMLInputElement>()
    const heightTwoRef = useRef<HTMLInputElement>()
    const [subtractHeight, setSubtractHeight] = useState(0)

    useEffect(() => {
      const heightOne = heightOneRef.current
      const heightTwo = heightTwoRef.current
      if (heightOne !== undefined && heightTwo !== undefined) {
        setSubtractHeight(heightOne.offsetHeight + heightTwo.offsetHeight)
      }
    }, [heightOneRef, heightTwoRef])

    return (
      <Box
        sx={{
          minWidth: '230px',
          maxWidth: isLg ? '420px' : '534px',
        }}
      >
        <Box ref={heightOneRef} sx={{ width: '100%', px: '12px', py: '12px', display: 'block' }}>
          <Typography variant="h6">
            Notifications
          </Typography>
        </Box>
        <Box
          sx={{
            // height: isLg ? '75vh' : `calc(100vh - ${subtractHeight}px)`,
            overflowY: 'scroll',
            display: 'block'
          }}
        >
          <MenuList sx={{ py: 0 }}>
            {currentMenuItems.length > 0
              ? currentMenuItems.map((item, i) => {
                const icon = item.success.includes('confirmed')
                  ? <CheckCircleIcon fontSize="small" color="success" />
                  : item.success.includes('failed')
                    ? <CancelIcon fontSize="small" color="error" />
                    : <ErrorIcon fontSize="small" color="warning" />
                if (i < 3) {
                  return (
                    <CustomMenuItem
                      txType={item.txType}
                      txId={item.txId}
                      success={item.success}
                      icon={icon}
                      time={item.time}
                      unread={item.unread}
                      key={item.txId}
                      index={i}
                    />
                  )
                }
              })
              : <MenuItem>

              </MenuItem>
            }
          </MenuList>

        </Box>
        <Box
          sx={{
            width: '100%',
            px: '6px',
            display: 'block',
            // position: isLg ? 'relative' : 'absolute',
            bottom: 0
          }}
          onClick={markAllRead}
          ref={heightTwoRef}
        >
          <Button fullWidth>
            Mark all as read
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <IconButton
        onClick={(e) =>
          isLg
            ? !anchorEl ? handleClick(e) : handleClose()
            : dialogOpen
              ? handleDialogClose()
              : handleDialogOpen()
        }
        sx={{
          '&:hover, &.Mui-focusVisible': {
            background: theme.palette.background.hover
          },
          borderRadius: '8px',
          zIndex: 103
        }}
      >
        {open || dialogOpen
          ? <CloseIcon />
          : <Badge
            badgeContent={numberUnread}
            color="primary"
          >
            <NotificationsIcon />
          </Badge>
        }

      </IconButton>
      <Fade in={dialogOpen} style={{ transitionDuration: "200ms" }}>
        <Box
          sx={{
            height: "calc(100vh - 60px)",
            width: "100vw",
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            zIndex: 102,
            background: theme.palette.background.default,
            mt: "60px",
            p: "16px",
            pb: 0,
          }}
        >
          <Contents />
        </Box>
      </Fade>
      <Popover
        id={id}
        open={open}
        onClose={handleClose}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          // zIndex: 100,
          mt: '10px',
          '& .MuiPopover-paper': {
            overflow: 'visible',
            background: theme.palette.background.paper,
            // filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            borderRadius: '0 0 12px 12px'
          }
        }}
      >
        <Contents />
      </Popover>
    </>
  );
};

export default NotificationsMenu;

////////////////////////////////
// START SAMPLE DATA ///////////
////////////////////////////////

const sampleMenuItems = [
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkkals1',
    success: 'confirmed',
    time: '8 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkkals2',
    success: 'submitted to mempool',
    time: '12 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'abcdalkdsjflkjasdf',
    success: 'failed',
    time: '2 hours',
    unread: false
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkkals3',
    success: 'confirmed',
    time: '8 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkkal4s',
    success: 'submitted to mempool',
    time: '12 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'abcdalkd5sjflkjasdf',
    success: 'failed',
    time: '2 hours',
    unread: false
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfk6kals',
    success: 'confirmed',
    time: '8 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkkal7s',
    success: 'submitted to mempool',
    time: '12 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'abcdalkds8jflkjasdf',
    success: 'failed',
    time: '2 hours',
    unread: false
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkka9ls',
    success: 'confirmed',
    time: '8 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzj99dfkkals',
    success: 'submitted to mempool',
    time: '12 minutes',
    unread: true
  },
  {
    txType: 'Purchase transaction',
    txId: 'abcdalkdsjf88lkjasdf',
    success: 'failed',
    time: '2 hours',
    unread: false
  },
  {
    txType: 'Purchase transaction',
    txId: 'xyzjdfkk777als',
    success: 'confirmed',
    time: '8 minutes',
    unread: true
  }
]

////////////////////////////////
// END SAMPLE DATA /////////////
////////////////////////////////