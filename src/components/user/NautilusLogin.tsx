import React, { useEffect, useState, FC } from "react";
import { Box, LinearProgress, Typography, Button } from "@mui/material";
import { Expanded } from "@components/user/SignIn";
import { trpc } from "@lib/trpc";
import { signIn } from "next-auth/react";
import { useWallet } from "@lib/contexts/WalletContext";

interface INautilusLogin {
  expanded: Expanded;
  setExpanded: React.Dispatch<React.SetStateAction<Expanded>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  localLoading: boolean;
  setLocalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  dappConnected: boolean;
  setDappConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dappConnection: Function;
}

const NautilusLogin: FC<INautilusLogin> = ({
  setExpanded,
  setLoading,
  localLoading,
  setLocalLoading,
  setModalOpen,
  dappConnected,
  setDappConnected,
  dappConnection,
}) => {
  const [defaultAddress, setDefaultAddress] = useState<string | undefined>(
    undefined
  );
  const [usedAddresses, setUsedAddresses] = useState<string[]>([]);
  const [unusedAddresses, setUnusedAddresses] = useState<string[]>([]);
  const getNonce = trpc.user.getNonce.useQuery(
    { userAddress: defaultAddress },
    { enabled: false, retry: false }
  );
  const [newNonce, setNewNonce] = useState<NonceResponse | undefined>(
    undefined
  );
  const {
    wallet,
    setWallet,
    setDAppWallet,
    sessionData,
    sessionStatus,
    fetchSessionData,
  } = useWallet();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const deleteEmptyUser = trpc.user.deleteEmptyUser.useMutation();

  useEffect(() => {
    if (
      defaultAddress &&
      dappConnected &&
      sessionStatus === "unauthenticated"
    ) {
      refetchData();
    } else if (dappConnected && !defaultAddress) getAddress();
  }, [defaultAddress, dappConnected, sessionStatus]);

  const getAddress = async () => {
    try {
      // @ts-ignore
      const changeAddress = await ergo.get_change_address();
      if (changeAddress) {
        setDefaultAddress(changeAddress);
      }
      // @ts-ignore
      const fetchUsedAddresses = await ergo.get_used_addresses();
      // @ts-ignore
      const fetchUnusedAddresses = await ergo.get_unused_addresses();
      setUsedAddresses(fetchUsedAddresses);
      setUnusedAddresses(fetchUnusedAddresses);
      setDAppWallet({
        connected: true,
        name: "nautilus",
        addresses: [
          changeAddress,
          ...fetchUsedAddresses,
          ...fetchUnusedAddresses,
        ],
      });
    } catch {
      setLocalLoading(false);
      console.error("Error fetching wallet address");
    }
  };

  // get the new nonce
  const refetchData = () => {
    getNonce
      .refetch()
      .then((response: any) => {
        if (response && response.error) {
          throw new Error(response.error.message);
        }
        setNewNonce(response.data.nonce);
      })
      .catch((error: any) => {
        console.error("Nonce error: " + error);
        setErrorMessage(error.message);
        setLocalLoading(false);
      });
  };

  useEffect(() => {
    if (newNonce && defaultAddress) {
      if (sessionStatus === "unauthenticated" && newNonce) {
        verifyOwnership(newNonce, defaultAddress);
      }
    }
  }, [newNonce, sessionStatus]);

  const verifyOwnership = async (nonce: NonceResponse, address: string) => {
    if (!nonce) {
      console.error("Invalid nonce");
      cleanup();
      return;
    }

    setLoading(true);
    // console.log('nonce: ' + nonce.nonce);

    try {
      // Try for ergo.auth
      // @ts-ignore
      const signature = await ergo.auth(address, nonce.nonce);
      // console.log(signature);

      if (!signature.signedMessage || !signature.proof) {
        console.error("signature failed to generate");
        cleanupForAuth(nonce);
        return;
      }

      try {
        // Try for signIn
        const response = await signIn("credentials", {
          nonce: nonce.nonce,
          userId: nonce.userId,
          signature: JSON.stringify(signature),
          wallet: JSON.stringify({
            type: "nautilus",
            defaultAddress: defaultAddress,
            usedAddresses,
            unusedAddresses,
          }),
          redirect: false,
        });

        if (!response?.status || response.status !== 200) {
          cleanupForAuth(nonce);
          return;
        }
      } catch (error) {
        console.error("Error during signIn:", error);
        cleanupForAuth(nonce);
        return;
      }
    } catch (error) {
      console.error("Error during wallet signature:", error);
      cleanupForAuth(nonce);
    } finally {
      await fetchSessionData();
      setLoading(false);
      setLocalLoading(false);
      setExpanded(undefined);
      setModalOpen(false);
    }
  };

  const cleanupForAuth = (nonce: NonceResponse) => {
    setDefaultAddress(undefined);
    setDappConnected(false);
    deleteEmptyUser.mutateAsync({
      userId: nonce.userId,
    });
    window.ergoConnector.nautilus.disconnect();
  };

  const cleanup = () => {
    setDefaultAddress(undefined);
    setDappConnected(false);
    setErrorMessage(undefined);
    window.ergoConnector.nautilus.disconnect();
    dappConnection();
  };

  return (
    <>
      {localLoading && (
        <Box>
          <Typography sx={{ mb: 1, textAlign: "center" }}>
            Please follow the prompts on Nautilus
          </Typography>
          <LinearProgress />
        </Box>
      )}
      {errorMessage && (
        <Box
          sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}
        >
          <Typography color="error" sx={{ flexGrow: 1 }}>
            Address already in use by another account
          </Typography>
          <Button variant="contained" onClick={() => cleanup()}>
            Try again
          </Button>
        </Box>
      )}
      {/* )} */}
    </>
  );
};

export default NautilusLogin;
