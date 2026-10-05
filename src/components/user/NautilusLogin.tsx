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
    undefined,
  );
  const [usedAddresses, setUsedAddresses] = useState<string[]>([]);
  const [unusedAddresses, setUnusedAddresses] = useState<string[]>([]);
  const allAddresses = [
    ...new Set([defaultAddress, ...usedAddresses, ...unusedAddresses]),
  ].filter((addr): addr is string => !!addr);

  const getNonce = trpc.user.getNonce.useQuery(
    { userAddress: defaultAddress, allAddresses },
    { enabled: false, retry: false },
  );
  const [newNonce, setNewNonce] = useState<NonceResponse | undefined>(
    undefined,
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
    undefined,
  );
  const deleteEmptyUser = trpc.user.deleteEmptyUser.useMutation();

  useEffect(() => {
    console.log("[NautilusLogin] useEffect:", { defaultAddress, dappConnected, sessionStatus, allAddressesLength: allAddresses.length });
    if (
      defaultAddress &&
      dappConnected &&
      sessionStatus === "unauthenticated" &&
      allAddresses.length > 0
    ) {
      console.log("[NautilusLogin] → refetchData (getting nonce)");
      refetchData();
    } else if (dappConnected && !defaultAddress) {
      console.log("[NautilusLogin] → getAddress");
      getAddress();
    }
  }, [defaultAddress, dappConnected, sessionStatus, allAddresses.length]);

  const getAddress = async () => {
    try {
      console.log("[NautilusLogin] getAddress: getting context...");
      const context = await window.ergoConnector.nautilus.getContext();
      console.log("[NautilusLogin] getAddress: got context, fetching all addresses...");
      const changeAddress = await context.get_change_address();
      const fetchUsedAddresses = await context.get_used_addresses();
      const fetchUnusedAddresses = await context.get_unused_addresses();
      console.log("[NautilusLogin] getAddress: changeAddress =", changeAddress);
      if (!changeAddress) return;
      // Batch all state updates together to avoid multiple renders
      // that would trigger duplicate nonce fetches
      setDefaultAddress(changeAddress);
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
    } catch (e) {
      setLocalLoading(false);
      console.error("Error fetching wallet address:", e);
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
        if (response?.data?.nonce) {
          setNewNonce(response.data.nonce);
        }
      })
      .catch((error: any) => {
        console.error("Nonce error: " + error);
        setErrorMessage(error.message);
        setLocalLoading(false);
      });
  };

  useEffect(() => {
    console.log("[NautilusLogin] nonce useEffect:", { newNonce: !!newNonce, defaultAddress, sessionStatus });
    if (newNonce && defaultAddress) {
      if (sessionStatus === "unauthenticated" && newNonce) {
        console.log("[NautilusLogin] → verifyOwnership");
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
      console.log("[NautilusLogin] verifyOwnership: getting context for auth...");
      const context = await window.ergoConnector.nautilus.getContext();
      console.log("[NautilusLogin] verifyOwnership: calling auth...");
      const signature = await context.auth(address, nonce.nonce);
      console.log("[NautilusLogin] verifyOwnership: got signature");
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
          setErrorMessage(
            "Login failed. If you registered with a different wallet, please login with that wallet first, then link this address in Settings > Wallets.",
          );
          cleanupForAuth(nonce);
          return;
        }
      } catch (error) {
        console.error("Error during signIn:", error);
        setErrorMessage(
          "Login failed. If you registered with a different wallet, please login with that wallet first, then link this address in Settings > Wallets.",
        );
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
    try { window.ergoConnector?.nautilus?.disconnect(); } catch {}
  };

  const cleanup = () => {
    setDefaultAddress(undefined);
    setDappConnected(false);
    setErrorMessage(undefined);
    try { window.ergoConnector?.nautilus?.disconnect(); } catch {}
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography color="error">{errorMessage}</Typography>
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
