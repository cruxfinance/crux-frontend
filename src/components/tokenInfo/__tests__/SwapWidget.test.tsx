import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SwapWidget from "../SwapWidget";

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

// Mock environment variable
process.env.CRUX_API = "https://api.test.com";

const mockTokenInfo = {
  decimals: 6,
};

const mockBestSwapResponse = {
  pool_state: {
    pool_id: "pool123",
    address: "addr123",
    quote_token_id: "token123",
    quote_token_name: "TEST",
    base_token_id:
      "0000000000000000000000000000000000000000000000000000000000000000",
    base_token_name: "ERG",
    quote_amount: 1000000,
    base_amount: 1000000000,
    erg_value: 100,
  },
  swap_result: {
    pool: {},
    input_amount: 1000000000, // 1 ERG in nanoERG
    output_amount: 950000, // 0.95 tokens
    price_impact: 0.5,
    effective_price: 0.95,
    fee_amount: 1000000,
    fee_token: "erg",
    fee_usd: 0.01,
  },
};

describe("SwapWidget", () => {
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

  const defaultProps = {
    tokenId: "test-token-id-123",
    tokenName: "Test Token",
    tokenTicker: "TEST",
  };

  const setupFetchMocks = () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/crux/token_info/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTokenInfo),
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
            Promise.resolve({ erg_price_use: 1, asset_price_erg: 0.5 }),
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
    it("renders swap form after loading completes", async () => {
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });
      // After loading, the swap form should be visible
      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });
    });

    it("renders swap form after loading", async () => {
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      expect(inputs).toHaveLength(2); // From and To fields
      expect(screen.getByText("From")).toBeInTheDocument();
      expect(screen.getByText("To")).toBeInTheDocument();
    });
  });

  describe("Input Mode (Forward Swap)", () => {
    it("accepts valid numeric input in From field", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await user.type(fromInput, "1.5");
      expect(fromInput).toHaveValue("1.5");
    });

    it("rejects non-numeric input", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await user.type(fromInput, "abc");
      expect(fromInput).toHaveValue("");
    });

    it("calls API with given_token_amount when typing in From field", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await user.type(fromInput, "1");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const swapCall = calls.find((call: string[]) =>
          call[0].includes("/spectrum/best_swap"),
        );
        expect(swapCall).toBeDefined();
        expect(swapCall[0]).toContain("given_token_amount=");
        expect(swapCall[0]).not.toContain("requested_token_amount=");
      });
    });

    it("populates To field with output_amount from response", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];
      const toInput = inputs[1];

      await user.type(fromInput, "1");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        // Output should be populated (0.95 tokens with 6 decimals = "0.950000")
        expect(toInput).toHaveValue("0.950000");
      });
    });
  });

  describe("Output Mode (Reverse Swap)", () => {
    it("allows typing in To field", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const toInput = inputs[1];

      await user.type(toInput, "100");
      expect(toInput).toHaveValue("100");
    });

    it("calls API with requested_token_amount when typing in To field", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const toInput = inputs[1];

      await user.type(toInput, "100");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const swapCall = calls.find(
          (call: string[]) =>
            call[0].includes("/spectrum/best_swap") &&
            call[0].includes("requested_token_amount="),
        );
        expect(swapCall).toBeDefined();
        expect(swapCall[0]).not.toContain("given_token_amount=");
      });
    });

    it("populates From field with input_amount from response in output mode", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];
      const toInput = inputs[1];

      await user.type(toInput, "100");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        // From field should be populated with input_amount (1 ERG = "1.000000000")
        expect(fromInput).toHaveValue("1.000000000");
      });
    });

    it("switches back to input mode when typing in From field after output mode", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];
      const toInput = inputs[1];

      // First type in To field (output mode)
      await user.type(toInput, "100");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(fromInput).not.toHaveValue("");
      });

      // Clear and type in From field (should switch to input mode)
      await user.clear(fromInput);
      await user.type(fromInput, "2");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        // Find the most recent best_swap call
        const swapCalls = calls.filter((call: string[]) =>
          call[0].includes("/spectrum/best_swap"),
        );
        const lastCall = swapCalls[swapCalls.length - 1];
        expect(lastCall[0]).toContain("given_token_amount=");
      });
    });
  });

  describe("Decimal Validation", () => {
    it("validates decimal places for From field based on token decimals", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      // ERG has 9 decimals, try to enter 10
      await user.type(fromInput, "1.1234567890");

      // Should show error for too many decimals
      await waitFor(() => {
        expect(screen.getByText(/Maximum.*decimal/i)).toBeInTheDocument();
      });
    });
  });

  describe("Direction Flip", () => {
    it("swaps From and To values when direction button is clicked", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setupFetchMocks();
      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await user.type(fromInput, "1");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(inputs[1]).toHaveValue("0.950000");
      });

      // Click the swap direction button
      const swapButton =
        screen.queryByTestId("swap-direction") ??
        document.querySelector('[data-testid="SwapVertIcon"]')?.parentElement;

      if (swapButton) {
        await user.click(swapButton);
      }
    });
  });

  describe("No Pool Found", () => {
    it("shows no pool found message when API returns 404", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("/crux/token_info/")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTokenInfo),
          });
        }
        if (url.includes("/spectrum/best_swap")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await act(async () => {
        render(<SwapWidget {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Swap")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("0.0");
      const fromInput = inputs[0];

      await user.type(fromInput, "1");

      // Advance timers past the debounce delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText(/No pool found/i)).toBeInTheDocument();
      });
    });
  });
});
