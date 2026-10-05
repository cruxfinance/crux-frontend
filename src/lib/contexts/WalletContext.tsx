import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
  FunctionComponent,
  useEffect,
  useCallback,
} from "react";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";

interface WalletState {
  wallet: string | undefined;
  dAppWallet: {
    connected: boolean;
    name: string;
    addresses: string[];
  };
  addWalletModalOpen: boolean;
  sessionData: Session | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  providerLoading: boolean;
  notSubscribedNotifyDialogOpen: boolean;
}

interface WalletContextType extends WalletState {
  setWallet: React.Dispatch<React.SetStateAction<string>>;
  setDAppWallet: React.Dispatch<
    React.SetStateAction<WalletState["dAppWallet"]>
  >;
  setSessionData: React.Dispatch<
    React.SetStateAction<WalletState["sessionData"]>
  >;
  setSessionStatus: React.Dispatch<
    React.SetStateAction<WalletState["sessionStatus"]>
  >;
  setProviderLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchSessionData: Function;
  clearAllWalletState: () => Promise<void>;
  setAddWalletModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotSubscribedNotifyDialogOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

interface WalletConsumerProps {
  children: (context: WalletContextType) => ReactNode;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WalletProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const [wallet, setWallet] = useState<string>("");
  const [providerLoading, setProviderLoading] = useState<boolean>(false);
  const [dAppWallet, setDAppWallet] = useState<WalletState["dAppWallet"]>({
    connected: false,
    name: "",
    addresses: [],
  });
  const [sessionData, setSessionData] =
    useState<WalletState["sessionData"]>(null);
  const [sessionStatus, setSessionStatus] =
    useState<WalletState["sessionStatus"]>("unauthenticated");
  const [addWalletModalOpen, setAddWalletModalOpen] = useState<boolean>(false);
  const [notSubscribedNotifyDialogOpen, setNotSubscribedNotifyDialogOpen] =
    useState<boolean>(false);

  const fetchSessionData = useCallback(async () => {
    setProviderLoading(true);
    try {
      const updatedSessionData = await getSession();

      if (updatedSessionData) {
        setSessionData(updatedSessionData);
        setSessionStatus("authenticated");
      } else {
        setSessionData(null);
        setSessionStatus("unauthenticated");
      }
    } catch (error) {
      console.error("Failed to fetch session data:", error);
      setSessionData(null);
      setSessionStatus("unauthenticated");
    }
    setProviderLoading(false);
  }, []);

  // Guard to prevent repeated reconnect attempts
  const reconnectAttempted = useRef(false);

  // Auto-reconnect dApp wallet when session is authenticated
  const reconnectDAppWallet = useCallback(async (sessionAddr?: string) => {
    if (typeof window === "undefined") return;

    // Wait for Nautilus extension to inject (it loads asynchronously)
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (window.ergoConnector?.nautilus) break;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    if (!window.ergoConnector?.nautilus) return;

    try {
      const nautilus = window.ergoConnector.nautilus;
      let isConnected = await nautilus.isConnected();

      if (!isConnected) {
        isConnected = await nautilus.connect();
      }

      if (isConnected) {
        const context = await nautilus.getContext();
        const changeAddress = await context.get_change_address();
        const usedAddresses = await context.get_used_addresses();
        const unusedAddresses = await context.get_unused_addresses();
        const allAddresses = [changeAddress, ...usedAddresses, ...unusedAddresses];

        // Verify reconnected wallet matches the authenticated session
        if (sessionAddr && !allAddresses.includes(sessionAddr)) {
          console.warn(
            "Connected Nautilus wallet does not match session address — skipping auto-reconnect"
          );
          return;
        }

        setDAppWallet({
          connected: true,
          name: "nautilus",
          addresses: allAddresses,
        });
      }
    } catch (error) {
      console.error("Failed to reconnect dApp wallet:", error);
    }
  }, []);

  useEffect(() => {
    fetchSessionData();
  }, []);

  // Reconnect dApp wallet when session becomes authenticated
  useEffect(() => {
    if (sessionStatus === "authenticated" && !dAppWallet.connected) {
      if (!reconnectAttempted.current) {
        reconnectAttempted.current = true;
        reconnectDAppWallet(sessionData?.user?.address);
      }
    }
    if (sessionStatus !== "authenticated") {
      reconnectAttempted.current = false;
    }
  }, [sessionStatus]);

  // Centralized cleanup for all wallet state
  const clearAllWalletState = useCallback(async () => {
    try {
      await window?.ergoConnector?.nautilus?.disconnect();
    } catch {
      // Extension may not be available
    }
    setDAppWallet({ connected: false, name: "", addresses: [] });
    setWallet("");
  }, []);

  // Re-validate session periodically
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const interval = setInterval(async () => {
      const session = await getSession();
      if (!session) {
        setSessionData(null);
        setSessionStatus("unauthenticated");
        setDAppWallet({ connected: false, name: "", addresses: [] });
        setWallet("");
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionStatus]);

  // Poll for wallet changes (Nautilus fires no events)
  useEffect(() => {
    if (!dAppWallet.connected || typeof window === "undefined") return;

    const POLL_INTERVAL = 10_000; // 10 seconds

    const checkWalletState = async () => {
      try {
        const nautilus = window.ergoConnector?.nautilus;
        if (!nautilus) {
          setDAppWallet({ connected: false, name: "", addresses: [] });
          return;
        }

        const isConnected = await nautilus.isConnected();
        if (!isConnected) {
          setDAppWallet({ connected: false, name: "", addresses: [] });
          return;
        }

        // Check if wallet address changed (user switched wallets)
        const context = await nautilus.getContext();
        const changeAddress = await context.get_change_address();

        if (changeAddress !== dAppWallet.addresses[0]) {
          const usedAddresses = await context.get_used_addresses();
          const unusedAddresses = await context.get_unused_addresses();
          const allAddresses = [changeAddress, ...usedAddresses, ...unusedAddresses];

          if (sessionData?.user?.address && !allAddresses.includes(sessionData.user.address)) {
            // Wallet no longer matches session — disconnect
            setDAppWallet({ connected: false, name: "", addresses: [] });
          } else {
            // Same user, just updated addresses
            setDAppWallet({ connected: true, name: "nautilus", addresses: allAddresses });
          }
        }
      } catch {
        // Extension may have been disabled/removed
        setDAppWallet({ connected: false, name: "", addresses: [] });
      }
    };

    const interval = setInterval(checkWalletState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [dAppWallet.connected, dAppWallet.addresses[0], sessionData?.user?.address]);

  // Context values passed to consumer
  const value = {
    wallet,
    dAppWallet,
    setWallet,
    setDAppWallet,
    sessionData,
    setSessionData,
    sessionStatus,
    setSessionStatus,
    fetchSessionData,
    clearAllWalletState,
    providerLoading,
    setProviderLoading,
    addWalletModalOpen,
    setAddWalletModalOpen,
    notSubscribedNotifyDialogOpen,
    setNotSubscribedNotifyDialogOpen,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

const WalletConsumer: FunctionComponent<WalletConsumerProps> = ({
  children,
}) => {
  return (
    <WalletContext.Consumer>
      {(context) => {
        if (context === undefined) {
          throw new Error("WalletConsumer must be used within WalletProvider");
        }
        return children(context);
      }}
    </WalletContext.Consumer>
  );
};

const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};

const getErgoWalletContext = async () => {
  const nautilus = window.ergoConnector.nautilus;
  await nautilus.connect();
  const context = await nautilus.getContext();
  return context;
};

export { WalletProvider, WalletConsumer, useWallet, getErgoWalletContext };
