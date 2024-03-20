import { useAlert } from '@contexts/AlertContext';
import { trpc } from '@lib/trpc';
import React, { FC, useContext, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Collapse, IconButton, Button } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import Link from '@components/Link';
import QRCode from 'react-qr-code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface IProcessPaymentProps {
  payment: TransferAmount[];
  paymentWalletType: 'nautilus' | 'mobile';
  onTransactionSuccess: (txId: string) => void;
}

type Submitting = "submitting" | "ergopay" | "success" | "failed" | undefined

const ProcessPayment: FC<IProcessPaymentProps> = ({
  payment,
  paymentWalletType,
  onTransactionSuccess
}) => {
  const [submitting, setSubmitting] = useState<Submitting>(undefined)
  const { addAlert } = useAlert();
  const [link, setLink] = useState<string>('')
  const [successTx, setSuccessTx] = useState<string | undefined>(undefined)

  // CHECK MOBILE TRANSACTION STUFF
  const [scanned, setScanned] = useState(false);
  const [stopPolling, setStopPolling] = useState(true);
  const [verificationId, setVerificationId] = useState('')
  const [transactionId, setTransactionId] = useState<string>('')
  ////////////////////////////////

  const transaction = trpc.transaction.getTransaction.useMutation()
  const initMobileTx = trpc.transaction.initMobileTx.useMutation()

  useEffect(() => {
    const submitTransaction = async () => {
      if (!payment || submitting !== undefined) return;
      if (payment && payment.length > 0 && submitting === undefined) {
        setSubmitting('submitting');
        try {
          if (paymentWalletType === 'nautilus') {
            const ergoCnct = window.ergoConnector.nautilus
            await ergoCnct.disconnect()
            const connected = await ergoCnct.connect();
            if (connected) {
              const context = await ergoCnct.getContext();
              const changeAddress = await context.get_change_address();
              const tx = await transaction.mutateAsync({
                address: changeAddress,
                amount: payment
              })
              if (tx) {
                const signedtx = await context.sign_tx(tx.unsignedTransaction);
                const ok = await context.submit_tx(signedtx);
                addAlert('success', `Submitted Transaction: ${ok}`);
                setSuccessTx(ok)
                setSubmitting('success')
                onTransactionSuccess(ok)
              } else throw new Error("Unable to build transaction.")
            }
            else {
              addAlert('error', 'Unable to connect to Nautilus')
            }
          }
          if (paymentWalletType === 'mobile') {
            const init = await initMobileTx.mutateAsync({ payment: JSON.stringify(payment) })
            const baseUrl = `${window.location.host}`;
            const ergopayDomain = `ergopay://${baseUrl}`;
            const ergopayLink = `${ergopayDomain}/api/ergo-mobile/payment?verificationId=${init}&address=#P2PK_ADDRESS#`
            setVerificationId(init)
            setLink(ergopayLink)
            setSubmitting('ergopay')
          }
        } catch (e: any) {
          console.error(e);
          if (e.info) {
            addAlert('error', e.info);
          } else if (e.message) {
            addAlert('error', e.message);
          } else {
            addAlert('error', 'An unexpected error occurred');
          }
          setSubmitting('failed')
        }
      }
    }

    submitTransaction()
  }, [payment, submitting])

  /////////////// POLLING QR CODE SCAN //////////////////////////////////////////

  const pollScan = trpc.transaction.checkMobileScan.useQuery({
    verificationId,
  }, {
    enabled: paymentWalletType === "mobile" && !scanned, // Start polling only if conditions are met
    refetchInterval: scanned ? false : 5000, // Poll every 5 seconds unless scanned is true
  });

  useEffect(() => {
    if (pollScan.data) {
      setTransactionId(pollScan.data)
      setScanned(true);
      setStopPolling(false)
    }
  }, [pollScan.data]);

  /////////////////////////////////////////////////////////////////////////////



  /////////////// POLLING MOBILE TRANSACTION ////////////////////////////////////

  const pollComplete = trpc.transaction.checkMobileSuccess.useQuery({
    transactionId,
  }, {
    enabled: paymentWalletType === "mobile" && !stopPolling, // Enable polling based on the stopPolling flag
    refetchInterval: stopPolling ? false : 2000, // Poll every 2 seconds unless stopPolling is true
  });

  useEffect(() => {
    if (pollComplete.data !== null && pollComplete.data >= 0) {
      setSubmitting('success');
      setSuccessTx(transactionId);
      onTransactionSuccess(transactionId)
      addAlert('success', `Submitted Transaction: ${transactionId}`);
      setStopPolling(true); // This will automatically stop the polling
    }
  }, [pollComplete.data]);

  /////////////////////////////////////////////////////////////////////////////

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
    <>
      <Collapse in={submitting === 'submitting'}>
        <Box
          sx={{
            textAlign: 'center',
          }}
        >
          <CircularProgress size={120} thickness={1} sx={{ mb: '12px' }} />
          <Typography
            sx={{
              fontWeight: '600',
              mb: '12px'
            }}
          >
            Awaiting your confirmation of the transaction in the dApp connector.
          </Typography>
        </Box>
      </Collapse>

      <Collapse in={submitting === 'success'}>
        <Box
          sx={{
            textAlign: 'center',
          }}
        >
          <TaskAltIcon sx={{ fontSize: '120px' }} />
          <Typography
            sx={{
              fontWeight: '600',
              mb: '12px'
            }}
          >
            Transaction submitted.
          </Typography>
          <Typography>
            View on explorer:
          </Typography>
          <Box sx={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            <Link href={'https://explorer.ergoplatform.com/en/transactions/' + successTx}>
              {successTx}
            </Link>
          </Box>
        </Box>
      </Collapse>
      <Collapse in={submitting === 'ergopay'}>
        <Collapse in={!scanned}>
          <Box sx={{ mb: 2 }}>
            <Typography>
              Scan the QR code or follow <Link href={link}>this link</Link>
              <IconButton onClick={() => copyToClipboard(link)}>
                <ContentCopyIcon sx={{ height: '18px', width: '18px' }} />
              </IconButton>
            </Typography>
          </Box>
          <Box>
            <Box sx={{ mx: 'auto', maxWidth: '260px', background: '#fff', p: 3, mb: 2, borderRadius: '12px' }}>
              <QRCode
                size={180}
                value={link}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </Box>
          </Box>
        </Collapse>
        <Collapse in={scanned}>
          <Typography sx={{ textAlign: 'center' }}>
            Please follow instructions on Mobile Wallet to submit the transaction
          </Typography>
        </Collapse>
      </Collapse>
      <Collapse in={submitting === 'failed'}>
        <Box
          sx={{
            textAlign: 'center',
          }}
        >
          <CancelOutlinedIcon sx={{ fontSize: '120px' }} />
          <Typography
            sx={{
              fontWeight: '600',
              mb: '12px'
            }}
          >
            Transaction failed, please try again.
          </Typography>
        </Box>
      </Collapse>
    </>
  );
};

export default ProcessPayment;