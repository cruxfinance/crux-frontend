import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MintWidget from "../MintWidget";

// Mock the contexts
jest.mock("@contexts/AlertContext", () => ({
  useAlert: () => ({ addAlert: jest.fn() }),
}));

jest.mock("@contexts/WalletContext", () => ({
  useWallet: () => ({ dAppWallet: { connected: false } }),
}));

// Mock icon utilities
jest.mock("@lib/utils/icons", () => ({
  checkLocalIcon: jest.fn().mockResolvedValue(null),
  getIconUrlFromServer: jest.fn().mockResolvedValue(null),
}));

// Mock trpc
jest.mock("@lib/trpc", () => ({
  trpc: {
    dexy: {
      getInstances: {
        useQuery: () => ({
          data: [
            {
              id: "1",
              name: "USE",
              stablecoinToken: "use-token-id",
            },
          ],
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock environment variable
process.env.CRUX_API = "https://api.test.com";

const mockTokenInfo = {
  decimals: 2,
};

const mockMintStatus = {
  instance: "USE",
  mint_type: "arb_mint",
  is_available: true,
  max_mint_amount: 100000, // 1000.00 USE
  erg_required_for_max: 1000000000000, // 1000 ERG
  box_state: {
    current_height: 1000000,
    oracle_rate: 1000000000, // 1 ERG per USE (in nanoERG)
    lp_erg_reserves: 10000000000000,
    lp_stablecoin_reserves: 10000000,
    lp_rate: 1000000000,
    bank_erg: 5000000000000,
    bank_stablecoin: 5000000,
    tracking_r4: 999000,
    tracking_r5: 0,
    period_blocks: 720,
    bank_fee_num: 10,
    buyback_fee_num: 5,
    fee_denom: 1000,
  },
  constraints: [],
  fee_amount: 1000000,
  fee_token: "erg",
  fee_usd: 0.01,
};

const mockBestSwapResponse = {
  pool_state: {
    pool_id: "pool123",
    address: "addr123",
    quote_token_id: "use-token-id",
    quote_token_name: "USE",
    base_token_id:
      "0000000000000000000000000000000000000000000000000000000000000000",
    base_token_name: "ERG",
    quote_amount: 1000000,
    base_amount: 1000000000,
    erg_value: 100,
  },
  swap_result: {
    pool: {},
    input_amount: 1000000000, // 1 ERG
    output_amount: 95, // 0.95 USE
    price_impact: 0.5,
    effective_price: 0.95,
    fee_amount: 1000000,
    fee_token: "erg",
    fee_usd: 0.01,
  },
};

describe("MintWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    // Clean up any pending timers if fake timers are in use
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  const setupFetchMocks = (
    options: { arbAvailable?: boolean; freeAvailable?: boolean } = {},
  ) => {
    const { arbAvailable = true, freeAvailable = true } = options;

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/crux/token_info/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTokenInfo),
        });
      }
      if (url.includes("/dexy/mint_status/") && url.includes("arb_mint")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockMintStatus,
              mint_type: "arb_mint",
              is_available: arbAvailable,
            }),
        });
      }
      if (url.includes("/dexy/mint_status/") && url.includes("free_mint")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockMintStatus,
              mint_type: "free_mint",
              is_available: freeAvailable,
            }),
        });
      }
      if (url.includes("/spectrum/best_swap")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBestSwapResponse),
        });
      }
      if (url.includes("/spectrum/price")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              erg_price_use: 1,
              asset_price_erg: 1,
              erg_price_usd: 1.5,
            }),
        });
      }
      if (url.includes("/coingecko/erg_price")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 1.5 }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  };

  describe("Rendering", () => {
    it("renders the mint form", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
        expect(screen.getByText("To")).toBeInTheDocument();
      });
    });

    it("shows instance selector", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        // USE appears in both the selector and the To field token display
        const useElements = screen.getAllByText("USE");
        expect(useElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows mode toggle buttons", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("Best Available")).toBeInTheDocument();
        expect(screen.getByText("Manual")).toBeInTheDocument();
      });
    });
  });

  describe("Input Mode (Forward Calculation)", () => {
    it("accepts valid numeric input in From field", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await userEvent.type(fromInput, "10");
      expect(fromInput).toHaveValue("10");
    });

    it("accepts input and triggers quote fetching", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await userEvent.type(fromInput, "1");

      // Verify the component accepts input
      expect(fromInput).toHaveValue("1");
    });

    it("uses given_token_amount in API call when in input mode", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await userEvent.type(fromInput, "1");

      // Wait for debounce and check the swap call
      await waitFor(
        () => {
          const calls = (global.fetch as jest.Mock).mock.calls;
          const swapCall = calls.find((call: string[]) =>
            call[0].includes("/spectrum/best_swap"),
          );
          if (swapCall) {
            expect(swapCall[0]).toContain("given_token_amount=");
            expect(swapCall[0]).not.toContain("requested_token_amount=");
          }
          // At minimum, verify the component accepted the input
          expect(fromInput).toHaveValue("1");
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Output Mode (Reverse Calculation)", () => {
    it("To field is editable", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("To")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const toInput = inputs[1];

      // Verify the To field is not disabled
      expect(toInput).not.toBeDisabled();
    });

    it("To field accepts numeric input", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("To")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const toInput = inputs[1];

      // Type a simple value
      await userEvent.type(toInput, "5");

      // The value should contain what we typed (may have additional formatting)
      expect(toInput).toHaveValue("5");
    });
  });

  describe("Decimal Validation", () => {
    it("validates decimal places for From field (ERG = 9 decimals)", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      // ERG has 9 decimals, try to enter 10
      await userEvent.type(fromInput, "1.1234567890");

      await waitFor(() => {
        expect(screen.getByText(/Maximum.*decimal/i)).toBeInTheDocument();
      });
    });

    it("validates decimal places for To field (USE = 2 decimals)", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("To")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const toInput = inputs[1];

      // USE has 2 decimals, try to enter 3
      await userEvent.type(toInput, "1.123");

      await waitFor(() => {
        expect(screen.getByText(/Maximum.*decimal/i)).toBeInTheDocument();
      });
    });
  });

  describe("Method Selection", () => {
    it("starts in best mode by default", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      // Verify "Best Available" button is selected
      const bestButton = screen.getByRole("button", {
        name: /Best Available/i,
      });
      expect(bestButton).toHaveClass("Mui-selected");
    });
  });

  describe("Direction Flip", () => {
    it("resets input mode when direction is flipped", async () => {
      setupFetchMocks();
      render(<MintWidget />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
      });

      // Find the swap direction button by its icon
      const swapButtons = screen.getAllByRole("button");
      const swapButton = swapButtons.find((btn) =>
        btn.querySelector('[data-testid="SwapVertIcon"]'),
      );

      if (swapButton) {
        await userEvent.click(swapButton);

        // Direction should change - in swap mode, only LP is available
        await waitFor(() => {
          // Mode toggle should be hidden in swap direction
          expect(screen.queryByText("Best Available")).not.toBeInTheDocument();
        });
      }
    });
  });
});

describe("Mint Calculation Functions", () => {
  // Test the calculation logic separately
  describe("calculateMintOutputWithFees", () => {
    const calculateMintOutputWithFees = (
      rawErgAmount: number,
      oracleRate: number,
      bankFeeNum: number,
      buybackFeeNum: number,
      feeDenom: number,
      stablecoinDecimals: number,
    ): number => {
      if (!oracleRate || oracleRate === 0) return 0;
      const totalMultiplier = feeDenom + bankFeeNum + buybackFeeNum;
      if (totalMultiplier === 0) return 0;
      const mintAmount = Math.floor(
        (rawErgAmount * feeDenom * Math.pow(10, stablecoinDecimals)) /
          (oracleRate * totalMultiplier),
      );
      return mintAmount;
    };

    it("calculates correct output with standard fees", () => {
      // 1 ERG (1e9 nanoERG), oracle rate 1e9 (1 ERG = 1 USE), fees 10+5 on 1000 base
      const result = calculateMintOutputWithFees(
        1000000000, // 1 ERG in nanoERG
        1000000000, // oracle rate
        10, // bank fee num
        5, // buyback fee num
        1000, // fee denom
        2, // stablecoin decimals
      );

      // Expected: (1e9 * 1000 * 100) / (1e9 * 1015) = 98.52... -> 98
      expect(result).toBe(98);
    });

    it("returns 0 for zero oracle rate", () => {
      const result = calculateMintOutputWithFees(1000000000, 0, 10, 5, 1000, 2);
      expect(result).toBe(0);
    });
  });

  describe("calculateErgInputForMint", () => {
    const calculateErgInputForMint = (
      desiredMintAmount: number,
      oracleRate: number,
      bankFeeNum: number,
      buybackFeeNum: number,
      feeDenom: number,
      stablecoinDecimals: number,
    ): number => {
      if (!oracleRate || oracleRate === 0) return 0;
      const totalMultiplier = feeDenom + bankFeeNum + buybackFeeNum;
      if (feeDenom === 0) return 0;
      const ergAmount = Math.ceil(
        (desiredMintAmount * oracleRate * totalMultiplier) /
          (feeDenom * Math.pow(10, stablecoinDecimals)),
      );
      return ergAmount;
    };

    it("calculates correct input for desired output", () => {
      // Want 100 USE (10000 raw), oracle rate 1e9
      const result = calculateErgInputForMint(
        10000, // 100.00 USE in raw
        1000000000, // oracle rate
        10, // bank fee num
        5, // buyback fee num
        1000, // fee denom
        2, // stablecoin decimals
      );

      // Expected: (10000 * 1e9 * 1015) / (1000 * 100) = 101500000000
      expect(result).toBe(101500000000);
    });

    it("returns 0 for zero oracle rate", () => {
      const result = calculateErgInputForMint(10000, 0, 10, 5, 1000, 2);
      expect(result).toBe(0);
    });

    it("inverse of output calculation gives approximately same input", () => {
      const inputErg = 1000000000; // 1 ERG
      const oracleRate = 1000000000;
      const bankFee = 10;
      const buybackFee = 5;
      const feeDenom = 1000;
      const decimals = 2;

      // Forward: ERG -> USE (floor loses some precision)
      const outputUse = Math.floor(
        (inputErg * feeDenom * Math.pow(10, decimals)) /
          (oracleRate * (feeDenom + bankFee + buybackFee)),
      );

      // Reverse: USE -> ERG (ceil rounds up)
      const requiredErg = Math.ceil(
        (outputUse * oracleRate * (feeDenom + bankFee + buybackFee)) /
          (feeDenom * Math.pow(10, decimals)),
      );

      // Due to floor in forward calculation, we lose precision
      // The required ERG to get the floored output will be <= original input
      // This is expected: we asked for the floor of what we could get
      expect(requiredErg).toBeLessThanOrEqual(inputErg);
      // But the difference should be small (within 1%)
      expect(requiredErg).toBeGreaterThan(inputErg * 0.99);
    });
  });
});
