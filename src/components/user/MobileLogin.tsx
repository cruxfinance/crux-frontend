import React, { useEffect, useState, FC } from 'react'
import { z } from 'zod';
import { trpc } from "@server/utils/trpc";
import QRCode from 'react-qr-code';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Input,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import Link from '@components/Link';
import { signIn } from 'next-auth/react';
import { Expanded } from './SignIn';

interface IMobileLogin {
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MobileLogin: FC<IMobileLogin> = ({ setModalOpen }) => {
  const [localLoading, setLocalLoading] = useState(false)
  const [address, setAddress] = useState<string>('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [signature, setSignature] = useState({
    signedMessage: '',
    proof: ''
  })
  const [isSignatureProcessed, setIsSignatureProcessed] = useState<boolean>(false);

  const loginMutation = trpc.auth.initiateLogin.useMutation();
  trpc.auth.checkLoginStatus.useQuery(
    // @ts-ignore
    { verificationId },
    {
      enabled: !!verificationId,
      refetchInterval: (data: { status: 'PENDING' | 'SIGNED'; signedMessage: string, proof: string } | undefined) => {
        // If the status is 'SIGNED', stop polling
        if (data?.status === 'SIGNED') {
          return false;
        }
        // Otherwise, continue polling every 2 seconds
        return 2000;
      },
      refetchIntervalInBackground: true,
      onSuccess: (data) => {
        if (data?.status === 'SIGNED') {
          console.log(data)
          setSignature({
            signedMessage: data.signedMessage,
            proof: data.proof
          });
        }
      }
    }
  );

  const initiateLoginFlow = async () => {
    try {
      setLocalLoading(true)
      const response = await loginMutation.mutateAsync({ address });
      setVerificationId(response.verificationId);
      setNonce(response.nonce);
      setIsSignatureProcessed(false); // Reset the processed state
    } catch (error) {
      console.error("Error initiating login flow:", error);
    }
  };

  const authSignIn = async () => {
    // console.log(signature)
    const response = await signIn("credentials", {
      nonce,
      defaultAddress: address,
      signature: JSON.stringify(signature),
      wallet: JSON.stringify({
        type: 'mobile',
        defaultAddress: address,
        address: address,
        icon: ''
      }),
      redirect: false
    });
    if (!response?.status || response.status !== 200) {
      console.log('error logging in');
    }
    // console.log(response);
    setModalOpen(false)
    setLocalLoading(false)
  }

  useEffect(() => {
    if (!isSignatureProcessed && signature.signedMessage !== '' && signature.proof !== '') {
      // console.log('proof received');
      authSignIn();
      setIsSignatureProcessed(true); // Mark the signature as processed
    }
  }, [signature]);

  return (
    <Box>
      <Collapse in={!isSignatureProcessed}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 1 }}>
          <TextField
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your wallet address"
            variant="filled"
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={initiateLoginFlow}
            disabled={localLoading}
          >
            {!localLoading
              ? 'Submit'
              : <CircularProgress size={18} />
            }
          </Button>
        </Box>
      </Collapse>
      <Collapse in={isSignatureProcessed && localLoading}>
        <Box>
          <Typography sx={{ mb: 1, textAlign: 'center' }}>
            Verifying signature
          </Typography>
          <LinearProgress />
        </Box>
      </Collapse>
      <Collapse in={verificationId !== null && !isSignatureProcessed}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <Typography sx={{ mb: 2 }}>
            Scan the QR code or click <Link href={`ergoauth://cruxfinance.io/api/mobile-auth/ergo-auth-request?verificationId=${verificationId}`}>this link</Link> to sign in.
          </Typography>
          <Box sx={{ display: 'inline-block', p: 4, background: '#fff', borderRadius: '12px' }}>
            <QRCode value={`ergoauth://cruxfinance.io/api/mobile-auth/ergo-auth-request?verificationId=${verificationId}`} />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default MobileLogin;