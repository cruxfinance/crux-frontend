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
  sessionData: Session | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  providerLoading: boolean;
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

  useEffect(() => {
    fetchSessionData();
  }, []);

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

export { WalletProvider, WalletConsumer, useWallet };
