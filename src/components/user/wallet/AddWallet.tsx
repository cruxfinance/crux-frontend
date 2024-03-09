import React, { FC, useState } from 'react';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import {
  Collapse,
  Typography,
  Box,
  useTheme,
  Avatar,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Ergopay from './AddMobileAddress';
import CreateIcon from '@mui/icons-material/Create';
import AddAddressManually from './AddAddressManually';
import { wallets } from '@lib/wallets';

const AddWallet: FC = () => {
  const { addAlert } = useAlert()
  const theme = useTheme();
  const [openAddWallet, setOpenAddWallet] = useState(false)
  const [ergopayOpen, setErgopayOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  const reset = () => {
    setManualOpen(false)
    setErgopayOpen(false)
    setOpenAddWallet(true)
  }

  const handleOpenAddWallet = () => {
    if (!openAddWallet) {
      setErgopayOpen(false)
      setManualOpen(false)
    }
    setOpenAddWallet(!openAddWallet)
  }

  const WalletButtonComponent: FC<WalletButtonProps> = ({
    name,
    walletType,
    messageSigning,
    icon,
    iconDark
  }) => {
    return (
      <Button
        startIcon={<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Avatar
            alt={
              name + ' Icon'
            }
            src={theme.palette.mode === 'dark' ? iconDark : icon}
            sx={{ height: '24px', width: '24px' }}
            variant={walletType === 'mobile' ? "circular" : "square"}
          />
          <Box>
            <Typography sx={{ fontSize: '1rem !important', color: theme.palette.text.primary }}>
              {name}
            </Typography>
          </Box>
        </Box>}
        sx={{
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '6px',
          mb: 1,
          px: 2,
          py: 1,
          justifyContent: "space-between",
          textTransform: 'none',
          '& .MuiListItemSecondaryAction-root': {
            height: '24px'
          },
          color: theme.palette.text.secondary
        }}
        fullWidth
        onClick={() => {
          if (walletType === 'nautilus' || walletType === 'ledger') {
            connectDapp(walletType, messageSigning)
          } else if (walletType === 'mobile') {
            setOpenAddWallet(false)
            setErgopayOpen(true)
          }
        }}
      />
    )
  }

  const ManualWalletButton: FC = () => {
    return (
      <Button
        startIcon={<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <CreateIcon />
          <Box>
            <Typography sx={{ fontSize: '1rem !important', color: theme.palette.text.primary }}>
              Enter address manually
            </Typography>
          </Box>
        </Box>}
        sx={{
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '6px',
          mb: 1,
          px: 2,
          py: 1,
          justifyContent: "space-between",
          textTransform: 'none',
          '& .MuiListItemSecondaryAction-root': {
            height: '24px'
          },
          color: theme.palette.text.secondary
        }}
        fullWidth
        onClick={() => {
          setOpenAddWallet(false)
          setManualOpen(true)
        }}
      />
    )
  }

  const addWallet = trpc.user.addAddedWallet.useMutation()
  const trpcContext = trpc.useUtils();
  const addWalletFunction = async (address: string, unusedAddresses: string[], usedAddresses: string[], type: string) => {
    const addWalletEvent = await addWallet.mutateAsync({
      changeAddress: address,
      unusedAddresses,
      usedAddresses,
      type
    })
    if (addWalletEvent.success) {
      addAlert(addWalletEvent.severity, addWalletEvent.message)
    }
    await trpcContext.user.getWallets.invalidate();
  }

  const connectDapp = async (walletType: 'nautilus' | 'ledger', messageSigning: boolean) => {
    try {
      // Attempt to disconnect, ignoring any errors that occur
      await window.ergoConnector['nautilus'].disconnect();
    } catch (error) {
      // Ignore the error and continue
    }

    try {
      const isConnected = await connectWallet();
      if (isConnected) {
        // console.log(isConnected)
        const addresses = await fetchAndSetAddresses();
        addWalletFunction(
          addresses.defaultAddress,
          addresses.unusedAddresses,
          addresses.usedAddresses,
          walletType
        )
      }
      else {
        addAlert('warning', 'No wallet selected')
        reset()
      }
    } catch (error: any) {
      console.error(error)
      // if (error.message.includes('undefined')) addAlert('error', 'Wallet not found')
      // else 
      handleError(error);
    }
  };

  const connectWallet = async () => {
    try {
      const connect = await window.ergoConnector['nautilus'].connect();
      return connect;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  };

  const fetchAndSetAddresses = async () => {
    try {
      // @ts-ignore
      const changeAddress = await ergo.get_change_address();
      // @ts-ignore
      const fetchUsedAddresses = await ergo.get_used_addresses();
      // @ts-ignore
      const fetchUnusedAddresses = await ergo.get_unused_addresses();
      return { defaultAddress: changeAddress, usedAddresses: fetchUsedAddresses, unusedAddresses: fetchUnusedAddresses };
    } catch (error) {
      console.error('Error fetching wallet address:', error);
      throw error;
    }
  };

  const handleError = (error: any) => {
    addAlert('error', `Error: ${error.message}`);
  };

  return (
    <Box>
      <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
        <Button
          endIcon={<ExpandMoreIcon sx={{ transform: openAddWallet ? 'rotate(180deg)' : null }} />}
          startIcon={
            <Box>
              <Typography sx={{ fontSize: '1rem !important', color: theme.palette.text.primary }}>
                {openAddWallet ? 'Close Add Wallet list' : `Add a wallet`}
              </Typography>
            </Box>
          }
          sx={{
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            mb: 1,
            px: 2,
            textTransform: 'none',
            '& .MuiListItemSecondaryAction-root': {
              height: '24px'
            },
            color: theme.palette.text.secondary,
            justifyContent: "space-between"
          }}
          fullWidth
          onClick={() => handleOpenAddWallet()}
        />
        <Collapse in={openAddWallet}>
          {wallets.map((item, i) => (
            <WalletButtonComponent {...item} key={`${item.name}-${i}`} />
          ))}
          <ManualWalletButton />
        </Collapse>
        <Collapse in={ergopayOpen} mountOnEnter unmountOnExit>
          <Box sx={{ px: 4 }}>
            <Typography sx={{ fontSize: '1.1rem !important', fontWeight: 700, my: 1, lineHeight: 1 }}>
              Provide your address by selecting it with Ergopay
            </Typography>
            <Ergopay setOpen={setErgopayOpen} />
          </Box>
        </Collapse>
        <Collapse in={manualOpen} mountOnEnter unmountOnExit>
          <Box sx={{ px: 4 }}>
            <Typography sx={{ mb: 1 }}>
              Enter Ergo addresses, separated by commas.
            </Typography>
            <AddAddressManually setOpen={setManualOpen} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default AddWallet;