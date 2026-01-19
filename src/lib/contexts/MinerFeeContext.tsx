import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  FC,
  ReactNode,
} from "react";

export const MIN_MINER_FEE = 1_000_000; // 0.001 ERG in nanoERG
export const DEFAULT_MINER_FEE = 2_000_000; // 0.002 ERG in nanoERG

const STORAGE_KEY = "minerFeePreference";
const DEBOUNCE_MS = 300;

interface MinerFeeContextType {
  minerFee: number;
  setMinerFee: (fee: number) => void;
}

const MinerFeeContext = createContext<MinerFeeContextType | undefined>(
  undefined,
);

export const MinerFeeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [minerFee, setMinerFeeState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? parseInt(saved, 10) : NaN;
      return !isNaN(parsed) && parsed >= MIN_MINER_FEE
        ? parsed
        : DEFAULT_MINER_FEE;
    }
    return DEFAULT_MINER_FEE;
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced persistence to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, minerFee.toString());
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [minerFee]);

  const setMinerFee = (fee: number) => {
    // Enforce minimum
    const validFee = fee >= MIN_MINER_FEE ? fee : MIN_MINER_FEE;
    setMinerFeeState(validFee);
  };

  const value = { minerFee, setMinerFee };

  return (
    <MinerFeeContext.Provider value={value}>
      {children}
    </MinerFeeContext.Provider>
  );
};

export const useMinerFee = () => {
  const context = useContext(MinerFeeContext);
  if (context === undefined) {
    throw new Error("useMinerFee must be used within a MinerFeeProvider");
  }
  return context;
};
