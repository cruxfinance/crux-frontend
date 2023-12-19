import React, { useEffect, useState, FC } from "react";
import { trpc } from "@lib/trpc";
import QRCode from "react-qr-code";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  LinearProgress,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import Link from "@components/Link";
import { useWallet } from "@contexts/WalletContext";
import { AddWalletExpanded } from "./AddWalletModal";

interface IAddMobileOpen {
  localLoading: boolean;
  setLocalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExpanded: React.Dispatch<React.SetStateAction<AddWalletExpanded>>;
}

const AddMobileOpen: FC<IAddMobileOpen> = ({
  localLoading,
  setLocalLoading,
  setModalOpen,
  setExpanded,
}) => {
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [address, setAddress] = useState<string>("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [signature, setSignature] = useState<Signature | undefined>(undefined);
  const [isSignatureProcessed, setIsSignatureProcessed] =
    useState<boolean>(false);
  const { setWallet } = useWallet();
  const mutateAddAddress = trpc.user.addAddress.useMutation();
  const loginMutation = trpc.user.initAddWallet.useMutation();
  trpc.auth.checkLoginStatus.useQuery(
    // @ts-ignore
    { verificationId },
    {
      enabled: !!verificationId,
      refetchInterval: (
        data:
          | {
              status: "PENDING" | "SIGNED";
              signedMessage: string;
              proof: string;
            }
          | undefined
      ) => {
        // If the status is 'SIGNED', stop polling
        if (data?.status === "SIGNED") {
          return false;
        }
        // Otherwise, continue polling every 2 seconds
        return 2000;
      },
      refetchIntervalInBackground: true,
      onSuccess: (data) => {
        if (data?.status === "SIGNED") {
          // console.log(data)
          setSignature({
            signedMessage: data.signedMessage,
            proof: data.proof,
          });
        }
      },
    }
  );

  const initiateLoginFlow = async () => {
    try {
      setLocalLoading(true);
      const response = await loginMutation.mutateAsync({ address });
      setVerificationId(response.verificationId);
      setNonce(response.nonce);
      setIsSignatureProcessed(false); // Reset the processed state
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  const addAddress = async () => {
    try {
      if (signature && nonce) {
        const response = await mutateAddAddress.mutateAsync({
          nonce,
          address,
          signature: signature,
          wallet: {
            type: "mobile",
            defaultAddress: address,
          },
        });

        if (response.defaultAddress) {
          setWallet(response.defaultAddress);
          setModalOpen(false);
          setExpanded(undefined);
          setLocalLoading(false);
        } else {
          setLocalLoading(false);
          setErrorMessage("Error: address not added");
        }
      }
    } catch (error: any) {
      setLocalLoading(false);
      if (error.message && error.message.includes("Nonce doesn't match")) {
        setErrorMessage(
          "Error: Nonce doesn't match database, try again or contact support"
        );
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  };

  useEffect(() => {
    if (!isSignatureProcessed && signature) {
      // console.log('proof received');
      addAddress();
      setIsSignatureProcessed(true); // Mark the signature as processed
    }
  }, [signature]);

  const authUrl = new URL(process.env.AUTH_DOMAIN || "https://ergopad.io");
  const ergoAuthDomain = `ergoauth://${authUrl.host}`;

  const resetForm = () => {
    setLocalLoading(false);
    setIsSignatureProcessed(false);
    setSignature(undefined);
    setVerificationId(null);
    setNonce(null);
    setAddress("");
    setErrorMessage(undefined);
  };

  return (
    <Box>
      <Collapse in={!isSignatureProcessed}>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 2, mb: 1 }}>
          <TextField
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your wallet address"
            variant="filled"
            fullWidth
            sx={{
              "& input": {
                paddingTop: "7px",
                paddingBottom: "7px",
              },
              "& .MuiInputBase-root": {
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                },
                "&:before": {
                  display: "none",
                },
                "&:after": {
                  display: "none",
                },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={initiateLoginFlow}
            disabled={localLoading}
          >
            {!localLoading ? "Submit" : <CircularProgress size={18} />}
          </Button>
        </Box>
      </Collapse>
      <Collapse in={isSignatureProcessed && localLoading}>
        <Box>
          <Typography sx={{ mb: 1, textAlign: "center" }}>
            Verifying signature
          </Typography>
          <LinearProgress />
        </Box>
      </Collapse>
      <Collapse in={verificationId !== null && !isSignatureProcessed}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 3,
          }}
        >
          <Typography sx={{ mb: 2 }}>
            Scan the QR code or click{" "}
            <Link
              href={`${ergoAuthDomain}/api/mobile-auth/add-wallet-request?verificationId=${verificationId}&address=${address}`}
            >
              this link
            </Link>{" "}
            to sign in.
          </Typography>
          <Box
            sx={{
              display: "inline-block",
              p: 4,
              background: "#fff",
              borderRadius: "12px",
            }}
          >
            <QRCode
              value={`${ergoAuthDomain}/api/mobile-auth/add-wallet-request?verificationId=${verificationId}&address=${address}`}
            />
          </Box>
        </Box>
      </Collapse>
      {errorMessage && (
        <Box
          sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}
        >
          <Typography color="error" sx={{ flexGrow: 1 }}>
            {errorMessage}
          </Typography>
          <Button variant="contained" onClick={() => resetForm()}>
            Try again
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AddMobileOpen;
