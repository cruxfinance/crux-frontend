import React, { useEffect, useState, FC } from "react";
import {
  Box,
  LinearProgress,
  Typography,
  useTheme,
  Collapse,
  useMediaQuery,
  Button,
  Avatar,
} from "@mui/material";
import { trpc } from "@lib/trpc";
import { nanoid } from "nanoid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useWallet } from "@contexts/WalletContext";
import { AddWalletExpanded } from "./AddWalletModal";

interface IAddNautilus {
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  expanded: AddWalletExpanded;
  setExpanded: React.Dispatch<React.SetStateAction<AddWalletExpanded>>;
}

const AddNautilus: FC<IAddNautilus> = ({
  setModalOpen,
  expanded,
  setExpanded,
}) => {
  const theme = useTheme();
  const [defaultAddress, setDefaultAddress] = useState<string | undefined>(
    undefined
  );
  const [message, setMessage] = useState(
    "Please follow the prompts on Nautilus"
  );
  const [retry, setRetry] = useState(false);
  const mutateAddAddress = trpc.user.addAddress.useMutation();
  const [localLoading, setLocalLoading] = useState(false);
  const [dappConnected, setDappConnected] = useState(false);
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [usedAddresses, setUsedAddresses] = useState<string[]>([]);
  const [unusedAddresses, setUnusedAddresses] = useState<string[]>([]);
  const { wallet, setWallet, setDAppWallet, sessionData, sessionStatus } =
    useWallet();
  const getNonce = trpc.user.getNonceProtected.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const [changeAddress, setChangeAddress] = useState<string | undefined>(
    undefined
  );
  const checkAddress = trpc.user.checkAddressAvailable.useQuery(
    { address: changeAddress },
    { enabled: false, retry: false }
  );

  useEffect(() => {
    if (
      typeof sessionData?.user.address !== "string" &&
      sessionStatus === "authenticated"
    ) {
      window.ergoConnector.nautilus.disconnect();
    }
  }, []);

  const getNewNonce = async (): Promise<string | null> => {
    try {
      const response = await getNonce.refetch();
      if (response && response.error) {
        throw new Error(response.error.message);
      }
      if (response.data?.nonce) {
        // console.log(response.data.nonce)
        return response.data.nonce;
      } else console.error("Unexpected nonce error");
      return null;
    } catch (error: any) {
      console.error("Nonce error: " + error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (defaultAddress) {
        const nonce = await getNewNonce();
        if (nonce !== null) {
          verifyOwnership(nonce, defaultAddress);
        } else {
          console.error("Unexpected nonce error");
        }
      } else getAddress();
    };
    if (sessionStatus === "authenticated" && dappConnected) fetchData();
  }, [defaultAddress, dappConnected, sessionStatus]);

  const connectNautilus = async () => {
    const connect = await window.ergoConnector.nautilus.connect();
    if (connect) {
      setDappConnected(true);
      // console.log('AddNautilus: dapp connected')
    } else {
      setDappConnected(false);
      setLocalLoading(false);
      setMessage("Failed to connect to nautilus");
      setRetry(true);
      console.error("Failed to connect to nautilus");
    }
  };

  const getAddress = async () => {
    try {
      // @ts-ignore
      const changeAddress = await ergo.get_change_address();
      if (changeAddress) {
        // console.log('AddNautilus: address retrieved')
        setMessage("Verifying that address is not in use");
        setChangeAddress(changeAddress);
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
    } catch (error) {
      setDappConnected(false);
      setLocalLoading(false);
      setExpanded(undefined);
      setChangeAddress(undefined);
      console.error("AddNautilus: ", error);
      window.ergoConnector.nautilus.disconnect();
    }
  };

  useEffect(() => {
    if (changeAddress !== undefined) {
      verifyAddressAvailability();
    }
  }, [changeAddress]);

  const verifyAddressAvailability = () => {
    if (changeAddress && message === "Verifying that address is not in use") {
      checkAddress
        .refetch()
        .then((response) => {
          if (response.data?.status === "unavailable") {
            // console.log('AddNautilus: address in use by another wallet')
            setMessage("Address in use by another wallet");
            setRetry(true);
            setDappConnected(false);
            setLocalLoading(false);
            setChangeAddress(undefined);
            window.ergoConnector.nautilus.disconnect();
          }
          if (response.data?.status === "available") {
            // console.log('AddNautilus: address is available')
            setDefaultAddress(changeAddress);
          }
        })
        .catch((error: any) => {
          console.error(error);
          setLocalLoading(false);
        });
    }
  };

  const verifyOwnership = async (nonce: string, address: string) => {
    try {
      setMessage("Address not in use, authenticate to verify wallet ownership");
      // @ts-ignore
      const signature = await ergo.auth(address, nonce);
      if (signature) {
        const response = await mutateAddAddress.mutateAsync({
          nonce,
          address,
          signature: signature,
          wallet: {
            type: "nautilus",
            defaultAddress: address,
            usedAddresses,
            unusedAddresses,
          },
        });
        if (response.defaultAddress) {
          // console.log(response.defaultAddress)
          setWallet(response.defaultAddress);
          setMessage(`Address ${address} successfully added`);
        } else {
          setMessage(`Error: Address ${address} not added`);
        }
      }
    } catch (error) {
      console.error(error);
      setChangeAddress(undefined);
      setDefaultAddress(undefined);
      setDappConnected(false);
      setRetry(true);
      setMessage("Unable to verify ownership");
      window.ergoConnector.nautilus.disconnect();
      console.error(error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRetry = () => {
    resetCleanup();
    setLocalLoading(true);
    setExpanded("nautilus");
    connectNautilus();
  };

  const resetCleanup = () => {
    window.ergoConnector.nautilus.disconnect();
    setMessage("Please follow the prompts on Nautilus");
    setDappConnected(false);
    setRetry(false);
    setChangeAddress(undefined);
    setDefaultAddress(undefined);
  };

  const handleComplete = () => {
    setMessage("Please follow the prompts on Nautilus");
    setDappConnected(true);
    setLocalLoading(true);
    setRetry(false);
    setChangeAddress(undefined);
    setDefaultAddress(undefined);
    setExpanded(undefined);
    setModalOpen(false);
  };

  return (
    <Collapse in={expanded !== "mobile"}>
      <Button
        fullWidth
        // disabled={walletAddress != ""}
        sx={{
          borderRadius: "6px",
          p: "0.5rem",
          justifyContent: "space-between",
          mb: "12px",
          display: "flex",
          minWidth: fullScreen ? "90vw" : "500px",
        }}
        onClick={() => {
          if (expanded === "nautilus") {
            setExpanded(undefined);
            setLocalLoading(false);
            resetCleanup();
          } else {
            handleRetry();
          }
        }}
      >
        <Box
          sx={{
            fontSize: "1.2rem",
            color: "text.primary",
            fontWeight: "400",
            textAlign: "left",
            display: "flex",
          }}
        >
          <Avatar
            src="/icons/nautilus.png"
            // variant="circular"
            sx={{
              height: "3rem",
              width: "3rem",
              mr: "1rem",
            }}
          />
          <Box>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: "400",
              }}
            >
              Nautilus
            </Typography>
            <Typography
              sx={{
                fontSize: ".9rem",
                color: "text.secondary",
                fontWeight: "400",
              }}
            >
              Add wallet using Nautilus dapp connector
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            transform:
              expanded === "nautilus" ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 100ms ease-in-out",
            textAlign: "right",
            lineHeight: "0",
            mr: "-0.5rem",
          }}
        >
          <ExpandMoreIcon />
        </Box>
      </Button>
      <Collapse in={expanded === "nautilus"}>
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ mb: 1 }}>{message}</Typography>
          <Collapse in={retry && !message.includes("successfully")}>
            <Button variant="contained" onClick={handleRetry}>
              Try again!
            </Button>
          </Collapse>
          <Collapse in={message.includes("successfully")}>
            <Button variant="contained" onClick={handleComplete}>
              Okay
            </Button>
          </Collapse>
          <Collapse in={localLoading}>
            <LinearProgress />
          </Collapse>
        </Box>
      </Collapse>
    </Collapse>
  );
};

export default AddNautilus;
