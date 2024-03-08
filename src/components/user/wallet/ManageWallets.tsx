import React, { FC, useEffect, useState } from 'react';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import {
  Typography,
  Box,
  useTheme,
  Avatar,
  IconButton,
  Collapse,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { ellipsis } from '@lib/flex';
import CreateIcon from '@mui/icons-material/Create';
import { wallets } from '@lib/wallets';

declare global {
  interface Window {
    ergoConnector: any;
  }
}

const ManageWallets: FC = () => {
  const { addAlert } = useAlert()
  const theme = useTheme();
  const walletList = trpc.user.getWallets.useQuery()

  const deleteItem = trpc.user.deleteAddedWallet.useMutation()
  const removeItem = async (walletId: string) => {
    const deleted = await deleteItem.mutateAsync({ walletId })
    if (deleted.success) addAlert('success', 'Wallet successfully removed')
    else addAlert('error', deleted.message)
    walletList.refetch()
  }

  const [openItemId, setOpenItemId] = useState('')

  const handleOpenItem = (id: string) => {
    if (openItemId !== id) {
      setOpenItemId(id)
    }
    else setOpenItemId('')
  }

  return (
    <Box sx={{ mb: 2, }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Connected Wallets</Typography>
      <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
        {walletList.data && walletList.data.success && walletList.data.walletList &&
          [...walletList.data.walletList, ...walletList.data.addedWalletList].map((item) => {
            const wallet = wallets.find(wallet => item.type === wallet.walletType)
            return (
              <Box key={item.id}>
                <Box
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
                    '&:hover': {
                      background: 'rgba(130,130,170,0.15)',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => handleOpenItem(item.id)}
                >
                  {item.type !== 'manual'
                    ? <Box><Avatar
                      src={theme.palette.mode === 'dark' ? wallet?.iconDark : wallet?.icon}
                      sx={{ height: '24px', width: '24px' }}
                      variant={wallet?.walletType === 'mobile' ? "circular" : "square"}
                    /></Box>
                    : <CreateIcon sx={{ height: '24px', width: '24px' }} />
                  }

                  <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.changeAddress}
                  </Box>
                  <Box>
                    <IconButton onClick={(e) => {
                      e.stopPropagation()
                      removeItem(item.id)
                    }}
                      disabled={item.changeAddress === walletList.data.defaultAddress}
                    >
                      <ClearIcon sx={{ height: '18px', width: '18px' }} />
                    </IconButton>
                  </Box>
                </Box>
                <Collapse in={openItemId === item.id}>
                  <Box sx={{ mb: 2, pl: 3 }}>
                    {item.usedAddresses.length < 1 && <Typography sx={ellipsis}>{item.changeAddress}</Typography>}
                    {item.usedAddresses.map((address, i) => (
                      <Typography key={`${address}-${i}`} sx={ellipsis}>{address}</Typography>
                    ))}
                    {item.unusedAddresses.map((address, i) => (
                      <Typography key={`${address}-${i}`} sx={ellipsis}>{address}</Typography>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
      </Box>
    </Box>
  );
};

export default ManageWallets;