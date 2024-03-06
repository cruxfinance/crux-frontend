import React, { FC, useEffect, useState } from 'react';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import {
  Typography,
  Box,
  useTheme,
  Avatar,
  IconButton,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

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
  const walletList = trpc.user.getWallets.useQuery()

  const deleteItem = trpc.user.deleteWallet.useMutation()
  const removeItem = async (walletId: string) => {
    const deleted = await deleteItem.mutateAsync({ walletId })
    if (deleted.success) addAlert('success', 'Wallet successfully removed')
    else addAlert('error', deleted.message)
    walletList.refetch()
  }

  return (
    <Box sx={{ mb: 2, }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Connected Wallets</Typography>
      <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
        {walletList.data && walletList.data.success && walletList.data.walletList &&
          walletList.data.walletList.map((item) => {
            const wallet = wallets.find(wallet => item.type === wallet.walletType)
            return (
              <Box
                key={item.id}
                sx={{
                  p: '3px 12px',
                  fontSize: '1rem',
                  minWidth: '64px',
                  width: '100%',
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '6px',
                  mb: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box>
                  <Avatar
                    src={theme.palette.mode === 'dark' ? wallet?.iconDark : wallet?.icon}
                    sx={{ height: '24px', width: '24px' }}
                    variant={wallet?.walletType === 'mobile' ? "circular" : "square"}
                  />
                </Box>
                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.changeAddress}
                </Box>
                <Box>
                  <IconButton onClick={() => {
                    removeItem(item.id)
                  }}
                    disabled={item.changeAddress === walletList.data.defaultAddress}
                  >
                    <ClearIcon sx={{ height: '18px', width: '18px' }} />
                  </IconButton>
                </Box>
              </Box>
            )
          })}
      </Box>
    </Box>
  );
};

export default AddWallet;