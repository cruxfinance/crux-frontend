import React, { FC, useEffect, useState } from 'react';
import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import {
  Typography,
  Box,
  useTheme,
  Avatar,
  Collapse,
  Checkbox,
} from '@mui/material';
import { ellipsis } from '@lib/flex';
import CreateIcon from '@mui/icons-material/Create';
import { wallets } from '@lib/wallets';

interface SelectedWalletsProps {
  checked: string[]
  setChecked: React.Dispatch<React.SetStateAction<string[]>>
}

const SelectWallets: FC<SelectedWalletsProps> = ({ checked, setChecked }) => {
  const theme = useTheme();
  const walletList = trpc.user.getWallets.useQuery()

  const [openItemId, setOpenItemId] = useState('')
  const handleOpenItem = (id: string) => {
    if (openItemId !== id) {
      setOpenItemId(id)
    }
    else setOpenItemId('')
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    event.stopPropagation();
    if (event.target.checked) {
      setChecked([...checked, id]);
    } else {
      setChecked(checked.filter(item => item !== id));
    }
  };

  useEffect(() => {
    if (walletList.data && walletList.data.success && walletList.data.walletList) {
      const walletIds = walletList.data.walletList.map(wallet => `wallet-${wallet.id}`);
      const addedWalletIds = walletList.data.addedWalletList.map(wallet => `added-${wallet.id}`);
      setChecked([...walletIds, ...addedWalletIds]);
    }
  }, [walletList.isSuccess]);

  return (
    <Box>
      <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
        {walletList.data && walletList.data.success && walletList.data.walletList &&
          walletList.data.walletList.map((item) => {
            const wallet = wallets.find(wallet => item.type === wallet.walletType)
            return (
              <Box key={`wallet-${item.id}`}>
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
                  onClick={() => handleOpenItem(`wallet-${item.id}`)}
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
                    <Checkbox
                      checked={checked.includes(`wallet-${item.id}`)}
                      onChange={(e) => handleChange(e, `wallet-${item.id}`)}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ 'aria-label': 'choose wallet' }}
                      sx={{ p: '3px' }}
                    />
                  </Box>
                </Box>
                <Collapse in={openItemId === `wallet-${item.id}`}>
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
        {walletList.data && walletList.data.success && walletList.data.addedWalletList &&
          walletList.data.addedWalletList.map((item) => {
            const wallet = wallets.find(wallet => item.type === wallet.walletType)
            return (
              <Box key={`added-${item.id}`}>
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
                  onClick={() => handleOpenItem(`added-${item.id}`)}
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
                    <Checkbox
                      checked={checked.includes(`added-${item.id}`)}
                      onChange={(e) => handleChange(e, `added-${item.id}`)}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ 'aria-label': 'choose wallet' }}
                      sx={{ p: '3px' }}
                    />
                  </Box>
                </Box>
                <Collapse in={openItemId === `added-${item.id}`}>
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

export default SelectWallets;