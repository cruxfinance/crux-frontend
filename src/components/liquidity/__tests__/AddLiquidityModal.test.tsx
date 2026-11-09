import React from "react";
import { render, screen } from "@testing-library/react";
import AddLiquidityModal from "../AddLiquidityModal";
import { emptyClPair } from "@components/cl/clLiquidity";
import { ERG_TOKEN_ID } from "@components/cl/clMath";

jest.mock("@contexts/AlertContext", () => ({
  useAlert: () => ({ addAlert: jest.fn() }),
}));
jest.mock("@contexts/MinerFeeContext", () => ({
  useMinerFee: () => ({ minerFee: 1100000 }),
}));
jest.mock("@components/cl/useClStatus", () => ({
  useClStatus: () => ({ state: "live", paused: false, message: null, storagePeriodBlocks: null }),
}));
jest.mock("@components/cl/useClCreate", () => ({
  useClCreate: () => ({ create: jest.fn(), creating: false }),
}));
jest.mock("@components/cl/useClData", () => ({
  fetchPairPositions: jest.fn().mockResolvedValue([]),
}));
jest.mock("@components/cl/walletTokens", () => ({
  apiJson: jest.fn().mockResolvedValue(null),
  fetchWalletBalances: jest.fn().mockResolvedValue({}),
}));
jest.mock("@components/cl/RangeChart", () => ({
  __esModule: true,
  default: () => null,
}));

process.env.CRUX_API = "https://api.test.com";

describe("AddLiquidityModal for a brand-new pair", () => {
  it("opens in custom-range first-provider mode with full range disabled", () => {
    const pair = emptyClPair(
      { id: ERG_TOKEN_ID, name: "ERG", decimals: 9 },
      { id: "a".repeat(64), name: "NEW", decimals: 4 },
    );
    render(
      <AddLiquidityModal
        open
        pair={pair}
        userAddresses={["9addr"]}
        walletConnected
        ergPrice={1}
        icons={{}}
        protocolConfig={null}
        initialMode="custom"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        onClCreated={jest.fn()}
      />,
    );
    expect(screen.getByText(/As the first provider you set the price/)).toBeInTheDocument();
    expect(screen.getByText("Full range").closest("button")).toBeDisabled();
    expect(screen.getByText("Custom range").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("NEW / ERG")).toBeInTheDocument();
  });
});
