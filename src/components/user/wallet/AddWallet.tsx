import React, { FC, useState } from 'react';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import {
  Collapse,
  Typography,
  Box,
  useTheme,
  Avatar,
  Button,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Ergopay from './AddMobileAddress';

declare global {
  interface Window {
    ergoConnector: any;
  }
}

type WalletButtonProps = {
  name: string;
  walletType: string;
  icon: string;
  iconDark: string;
  messageSigning: boolean;
}

const wallets: WalletButtonProps[] = [
  {
    name: 'Nautilus',
    walletType: 'nautilus',
    icon: '/wallet-logos/nautilus-128.png',
    iconDark: '/wallet-logos/nautilus-128.png',
    messageSigning: true
  },
  {
    name: 'Terminus/Mobile',
    walletType: 'mobile',
    icon: '/wallet-logos/mobile.webp',
    iconDark: '/wallet-logos/mobile.webp',
    messageSigning: true
  },
  {
    name: 'Ledger',
    walletType: 'ledger',
    icon: '/wallet-logos/ledger.svg',
    iconDark: '/wallet-logos/ledger-dark.svg',
    messageSigning: false
  }
]

const AddWallet: FC = () => {
  const { addAlert } = useAlert()
  const theme = useTheme();
  const [openAddWallet, setOpenAddWallet] = useState(false)
  const [openManageWallets, setOpenManageWallets] = useState(false)
  const [ergopayOpen, setErgopayOpen] = useState(false)
  const [ergopayInfo, setErgopayInfo] = useState<{ walletType: 'mobile', messageSigning: boolean }>({
    walletType: 'mobile',
    messageSigning: true
  })
  const [transactionVerifyOpen, setTransactionVerifyOpen] = useState(false)
  const [ergoauthOpen, setErgoauthOpen] = useState(false)
  const [defaultAddress, setDefaultAddress] = useState<string | undefined>(undefined);
  const [verificationId, setVerificationId] = useState<string | undefined>(undefined);
  const [usedAddresses, setUsedAddresses] = useState<string[]>([])
  const [unusedAddresses, setUnusedAddresses] = useState<string[]>([])

  const reset = () => {
    setErgoauthOpen(false)
    setDefaultAddress(undefined)
    setVerificationId(undefined)
    setUsedAddresses([])
    setUnusedAddresses([])
    setTransactionVerifyOpen(false)
    setErgopayOpen(false)
    setOpenAddWallet(true)
    setOpenManageWallets(false)
  }

  const handleOpenAddWallet = () => {
    if (!openAddWallet) {
      setErgopayOpen(false)
      setErgoauthOpen(false)
      setOpenManageWallets(false)
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
            setOpenManageWallets(false)
            setErgopayInfo({ walletType, messageSigning })
            setErgopayOpen(true)
          }
        }}
      />
    )
  }

  const addWallet = trpc.user.addWallet.useMutation()
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
      setDefaultAddress(changeAddress)
      setUsedAddresses(fetchUsedAddresses);
      setUnusedAddresses(fetchUnusedAddresses);
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
                {openAddWallet ? 'Close wallet list' : `Add a wallet`}
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
        </Collapse>
        <Collapse in={ergopayOpen} mountOnEnter unmountOnExit>
          <Typography sx={{ fontSize: '1.1rem !important', fontWeight: 700, my: 1, lineHeight: 1 }}>
            Provide your address by selecting it with Ergopay
          </Typography>
          <Ergopay setOpen={setErgopayOpen} />
        </Collapse>
      </Box>
    </Box>
  );
};

export default AddWallet;