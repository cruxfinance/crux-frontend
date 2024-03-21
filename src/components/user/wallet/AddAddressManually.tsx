import React, { FC, useState } from 'react';
import {
  Box, FilledInput, IconButton,
} from '@mui/material';
import { trpc } from '@lib/trpc';
import { useAlert } from '@contexts/AlertContext';
import CheckIcon from '@mui/icons-material/Check';
import { flexRow } from '@lib/flex';
import ClearIcon from '@mui/icons-material/Clear';

interface IAddAddressManuallyProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const isErgoMainnetAddress = (value: string): boolean => {
  const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return value.startsWith('9') &&
    value.length === 51 &&
    [...value].every(char => base58Chars.includes(char));
};

const AddAddressManually: FC<IAddAddressManuallyProps> = ({ setOpen }) => {
  const { addAlert } = useAlert();
  const [addressList, setAddressList] = useState<string>('');

  const addWallet = trpc.user.addAddedWallet.useMutation();
  const trpcContext = trpc.useUtils();

  const addWalletFunction = async (addresses: string[]) => {
    const results = await Promise.all(addresses.map(async (address) => {
      return addWallet.mutateAsync({
        changeAddress: address,
        unusedAddresses: [],
        usedAddresses: [],
        type: 'manual'
      });
    }));

    let addedCount = 0;
    let updatedCount = 0;

    results.forEach(result => {
      if (result.success) {
        if (result.severity === "success") {
          addedCount++;
        } else if (result.severity === "warning") {
          updatedCount++;
        }
      }
    });

    // Determine the appropriate alert to show based on the counts
    if (addedCount > 0 && updatedCount > 0) {
      // Some wallets were added, and some were updated
      addAlert('success', `Successfully added ${addedCount} wallets, and updated ${updatedCount} wallets`);
    } else if (addedCount > 0) {
      // Only new wallets were added
      addAlert('success', `Successfully added ${addedCount} addresses`);
    } else if (updatedCount > 0) {
      // Only existing wallets were updated
      addAlert('warning', `${updatedCount} wallets updated, no new wallets added`);
    } else {
      addAlert('error', 'No valid Ergo mainnet addresses found or processed.');
    }

    // Invalidate cache to refresh the data
    await trpcContext.user.getWallets.invalidate();
  }

  const handleSubmit = () => {
    if (addressList) {
      const addresses = addressList.split(',')
        .map(address => address.trim())
        .filter(isErgoMainnetAddress);
      if (addresses.length > 0) {
        addWalletFunction(addresses);
      } else {
        addAlert('error', 'No valid Ergo mainnet addresses found.');
      }
    }
  }

  const handleClear = () => {
    setAddressList('')
  }

  return (
    <Box sx={{ ...flexRow, justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1 }}>
      <Box sx={{ flexGrow: 1, width: '100%', alignItems: 'center' }}>
        <FilledInput
          value={addressList}
          onChange={(e) => setAddressList(e.target.value)}
          fullWidth
          sx={{ '& input': { py: '1px', px: '6px' } }}
        />
      </Box>
      <IconButton onClick={handleSubmit} sx={{ p: 0 }}>
        <CheckIcon />
      </IconButton>
      <IconButton onClick={handleClear} sx={{ p: 0 }}>
        <ClearIcon />
      </IconButton>
    </Box>
  );
};

export default AddAddressManually;
