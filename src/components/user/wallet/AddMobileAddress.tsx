import React, { FC, useContext, useEffect, useRef, useState } from 'react';
import {
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import Link from '@components/Link';
import QRCode from 'react-qr-code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { trpc } from '@lib/trpc';
import { useAlert } from '@contexts/AlertContext';

interface IErgopayProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const Ergopay: FC<IErgopayProps> = ({ setOpen }) => {
  const { addAlert } = useAlert();
  const baseUrl = `${window.location.host}`;
  const ergopayDomain = `ergopay://${baseUrl}`;
  const [verificationId, setverificationId] = useState<string | undefined>(undefined)
  const [link, setLink] = useState<string | undefined>(undefined)
  const initVerify = trpc.verify.initVerification.useMutation();
  const [initialized, setInitialized] = useState(false)
  const [stopPolling, setStopPolling] = useState(false);
  const pollVerify = trpc.verify.getAddress.useQuery({
    verificationId: verificationId ?? ''
  }, {
    enabled: false
  });

  const handleInit = async () => {
    try {
      const init = await initVerify.mutateAsync();
      if (init) {
        setInitialized(true)
        setverificationId(init)
      }
    } catch (error) {
      addAlert('error', error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }

  useEffect(() => {
    handleInit()
  }, [])

  useEffect(() => {
    if (verificationId) {
      const newLink = `${ergopayDomain}/api/ergo-mobile/p2pk?p2pkAddress=#P2PK_ADDRESS#&verificationId=${verificationId}`
      setLink(newLink)
    }
  }, [verificationId])

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (stopPolling) {
        clearInterval(intervalId);
      } else {
        pollVerify.refetch();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [stopPolling, initialized]);

  const addWallet = trpc.user.addAddedWallet.useMutation()
  const trpcContext = trpc.useUtils();
  const addWalletFunction = async (address: string) => {
    const addWalletEvent = await addWallet.mutateAsync({
      changeAddress: address,
      unusedAddresses: [],
      usedAddresses: [],
      type: 'mobile'
    })
    if (addWalletEvent.success) {
      addAlert(addWalletEvent.severity, addWalletEvent.message)
    }
    await trpcContext.user.getWallets.invalidate();
  }

  useEffect(() => {
    if (pollVerify.data) {
      addWalletFunction(pollVerify.data)
      setOpen(false)
      setStopPolling(true);
    }
  }, [pollVerify.data]);

  const copyToClipboard = (link: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        addAlert('success', 'Link copied to clipboard!');
      }).catch(err => {
        addAlert('error', `Failed to copy link: ${err}`);
      });
    } else {
      // Fallback using document.execCommand (less reliable and secure)
      try {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        addAlert('success', 'Link copied to clipboard!');
      } catch (err) {
        addAlert('error', `Failed to copy link: ${err}`);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {link ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography>
                Scan the QR code or follow <Link href={link}>this link</Link>
                <IconButton onClick={() => copyToClipboard(link)}>
                  <ContentCopyIcon sx={{ height: '18px', width: '18px' }} />
                </IconButton>
              </Typography>
            </Box>
            <Box sx={{ background: '#fff', p: 3, mb: 2, borderRadius: '12px' }}>
              <QRCode
                size={180}
                value={link}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </Box>
          </>
        ) : (
          <Box>
            Loading...
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Ergopay;