import {
  ReactNode,
  createContext,
  useContext,
  useState,
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

  // Auto-reconnect dApp wallet when session is authenticated
  const reconnectDAppWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ergoConnector?.nautilus) {
      return;
    }

    try {
      const nautilus = window.ergoConnector.nautilus;
      // Check if already connected
      let isConnected = await nautilus.isConnected();

      // If not connected, try to connect
      if (!isConnected) {
        isConnected = await nautilus.connect();
      }

      if (isConnected) {
        const context = await nautilus.getContext();
        const changeAddress = await context.get_change_address();
        const usedAddresses = await context.get_used_addresses();
        const unusedAddresses = await context.get_unused_addresses();

        setDAppWallet({
          connected: true,
          name: "nautilus",
          addresses: [changeAddress, ...usedAddresses, ...unusedAddresses],
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
      reconnectDAppWallet();
    }
  }, [sessionStatus, dAppWallet.connected, reconnectDAppWallet]);

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
