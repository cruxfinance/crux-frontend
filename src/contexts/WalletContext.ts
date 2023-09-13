import React, { createContext } from "react";

interface IWalletType {
  name: string;
  icon: string;
  version: string;
}

export interface IDAppWallet {
  connected: boolean;
  name: string;
  addresses: string[];
}

export interface IWalletContext {
  walletAddress: string | undefined;
  setWalletAddress: React.Dispatch<React.SetStateAction<string | undefined>>;
  dAppWallet: IDAppWallet;
  setDAppWallet: React.Dispatch<React.SetStateAction<IDAppWallet>>;
  addWalletModalOpen: boolean;
  setAddWalletModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  expanded: string | false;
  setExpanded: React.Dispatch<React.SetStateAction<string | false>>;
}

export const WalletContext = createContext({} as IWalletContext);
