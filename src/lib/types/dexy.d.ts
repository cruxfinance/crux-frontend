declare global {
  type DexyAnalytics = {
    instance: string;
    timestamp: number;
    stablecoinTotalSupply: number;
    stablecoinInBank: number;
    stablecoinInCirculation: number;
    stablecoinInCoreLp: number;
    stablecoinOnHands: number;
    ergInBank: number;
    ergInCoreLp: number;
    ergTvl: number;
    ergPriceUsd: number;
    bankReserveRatio: number;
    relativeReserveRatio: number;
    relativeRrWithLp: number;
    protocolTvlUsd: number;
  };

  type DexyHistoryPoint = {
    timestamp: number;
    value: number;
  };

  type DexyMetric =
    | "reserve_ratio"
    | "relative_reserve_ratio"
    | "relative_rr_with_lp"
    | "stablecoin_circulation"
    | "stablecoin_in_core_lp"
    | "stablecoin_on_hands"
    | "erg_in_bank"
    | "erg_tvl"
    | "protocol_tvl_usd";

  type DexyResolution = "1h" | "1d" | "1w";

  // Dexy instance configuration
  type DexyInstance = {
    id: number;
    name: string;
    bankNft: string;
    lpNft: string;
    oraclePoolNft: string;
    stablecoinToken: string;
    initialRatio: number | null;
    arbmintNft: string | null;
    freemintNft: string | null;
    buybackNft: string | null;
    arbmintMarginPct: number | null;
    arbmintTrackingDelay: number | null;
    freemintRateNum: number | null;
    freemintRateDenom: number | null;
    freemintPeriodBlocks: number | null;
    freemintMaxPct: number | null;
    dexyBankFeePct: number | null;
    dexyBuybackFeePct: number | null;
  };

  // Mint operation types
  type MintType = "arbmint" | "freemint";

  // Constraint types for mint unavailability
  type MintConstraint =
    | {
        type: "lp_rate_too_low";
        lpRate: number;
        oracleRate: number;
        requiredMarginPct: number;
      }
    | {
        type: "tracking_delay_not_met";
        blocksSinceReset: number;
        requiredBlocks: number;
      }
    | {
        type: "free_mint_rate_condition_not_met";
        lpRate: number;
        oracleRate: number;
        rateNum: number;
        rateDenom: number;
      }
    | {
        type: "tracking_period_not_reset";
        currentHeight: number;
        resetHeight: number;
      }
    | {
        type: "no_remaining_allowance";
        remaining: number;
      }
    | {
        type: "insufficient_bank_stablecoin";
        required: number;
        available: number;
      }
    | {
        type: "configuration_missing";
        field: string;
      }
    | {
        type: "error";
        message: string;
      };

  // Current state of mint-related boxes
  type MintBoxState = {
    currentHeight: number;
    oracleRate: number;
    lpErgReserves: number;
    lpStablecoinReserves: number;
    lpRate: number;
    bankErg: number;
    bankStablecoin: number;
    trackingR4: number;
    trackingR5: number;
    trackingDelay: number | null;
    thresholdPercent: number | null;
    periodBlocks: number | null;
    bankFeeNum: number | null;
    buybackFeeNum: number | null;
    feeDenom: number | null;
  };

  // Result of mint availability check
  type MintStatus = {
    instance: string;
    mintType: MintType;
    isAvailable: boolean;
    maxMintAmount: number;
    ergRequiredForMax: number;
    boxState: MintBoxState;
    constraints: MintConstraint[];
    feeAmount: number;
    feeToken: string;
    feeUsd: number;
  };

  // Result of mint transaction building
  type MintResult = {
    mintAmount: number;
    ergToBank: number;
    feeAmount: number;
    feeToken: string;
    feeUsd: number;
    dexyBankFee: number;
    dexyBuybackFee: number;
  };

  // EIP-12 transaction types (shared)
  type EIP12UnsignedTransaction = {
    inputs: any[];
    dataInputs: any[];
    outputs: any[];
  };

  // Build mint transaction response
  type BuildMintTxResponse = {
    transaction: EIP12UnsignedTransaction;
    mintDetails: MintResult;
  };
}

export {};
