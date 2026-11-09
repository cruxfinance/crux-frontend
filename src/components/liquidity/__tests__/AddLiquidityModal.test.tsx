import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddLiquidityModal from "../AddLiquidityModal";
import { emptyClPair } from "@components/cl/clLiquidity";
import type { MergedPair } from "@components/cl/clLiquidity";
import { ERG_TOKEN_ID } from "@components/cl/clMath";
import type { CpFeeTier, CruxCpPool } from "@components/cl/cpCreateMath";
import type { PoolWithApr } from "../liquidityTypes";
import { apiJson, fetchWalletBalances, submitSignedTx } from "@components/cl/walletTokens";

jest.mock("@contexts/AlertContext", () => ({
  useAlert: () => ({ addAlert: jest.fn() }),
}));
jest.mock("@contexts/MinerFeeContext", () => ({
  useMinerFee: () => ({ minerFee: 1100000 }),
}));
const mockClStatus = jest.fn();
jest.mock("@components/cl/useClStatus", () => ({
  useClStatus: () => mockClStatus(),
}));
jest.mock("@components/cl/useClCreate", () => ({
  useClCreate: () => ({ create: jest.fn(), creating: false }),
}));
const mockGetJson = jest.fn();
jest.mock("@components/cl/useClData", () => ({
  fetchPairPositions: jest.fn().mockResolvedValue([]),
  getJson: (path: string) => mockGetJson(path),
}));
jest.mock("@components/cl/walletTokens", () => ({
  apiJson: jest.fn(),
  submitSignedTx: jest.fn(),
  fetchWalletBalances: jest.fn(),
}));
jest.mock("@components/cl/RangeChart", () => ({
  __esModule: true,
  default: () => null,
}));

process.env.CRUX_API = "https://api.test.com";

const TOK = "a".repeat(64);
const TIERS: CpFeeTier[] = [5, 30, 50, 100, 150, 200].map((bps) => ({
  fee_bps: bps,
  lp_fee_pct: bps / 100,
  protocol_fee_pct: bps === 5 ? 0.02 : 0.1,
}));

const livePool = { state: "live", paused: false, message: null, storagePeriodBlocks: null };

const poolFixture = (over: Partial<PoolWithApr>): PoolWithApr => ({
  pool_id: "pool-spectrum",
  pool_type: "spectrum",
  base_token_id: ERG_TOKEN_ID,
  base_token_name: "ERG",
  base_token_decimals: 9,
  quote_token_id: TOK,
  quote_token_name: "TOK",
  quote_token_decimals: 4,
  base_amount: 100_000_000_000,
  quote_amount: 1_000_000,
  tvl_erg: 200,
  fee_pct: 0.3,
  volume_24h: 0,
  apr_7d: null,
  apr_30d: null,
  ...over,
});

const cruxPool = (id: string, lpFeeBps: number): CruxCpPool => ({
  ...poolFixture({ pool_id: id, pool_type: "crux_cp", fee_pct: 0.4 }),
  lp_fee_bps: lpFeeBps,
  kind: "n2t",
});

const emptyPair = () =>
  emptyClPair(
    { id: ERG_TOKEN_ID, name: "ERG", decimals: 9 },
    { id: TOK, name: "TOK", decimals: 4 },
  );

const pairWith = (pools: PoolWithApr[]): MergedPair => ({
  ...emptyPair(),
  pools,
  pool: pools[0] ?? null,
});

let tiers = TIERS;
let cpPools: CruxCpPool[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  tiers = TIERS;
  cpPools = [];
  mockClStatus.mockReturnValue(livePool);
  mockGetJson.mockImplementation(async (path: string) => {
    if (path.startsWith("/dex/cp/status")) return { tiers };
    if (path.startsWith("/dex/cp/pools")) return { pools: cpPools };
    throw new Error(`unexpected GET ${path}`);
  });
  (fetchWalletBalances as jest.Mock).mockResolvedValue(
    new Map([
      [ERG_TOKEN_ID, 100_000_000_000], // 100 ERG
      [TOK, 50_000_000], // 5000 TOK
    ]),
  );
});

const renderModal = (pair: MergedPair, extra: Partial<React.ComponentProps<typeof AddLiquidityModal>> = {}) => {
  const props = {
    open: true,
    pair,
    userAddresses: ["9addr"],
    walletConnected: true,
    ergPrice: 1,
    icons: {},
    protocolConfig: null,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    onClCreated: jest.fn(),
    ...extra,
  };
  render(<AddLiquidityModal {...props} />);
  return props;
};

const poolSelect = () => screen.getAllByRole("combobox")[0];

describe("AddLiquidityModal for a brand-new pair", () => {
  it("opens in custom-range first-provider mode and leaves full range selectable", async () => {
    renderModal(emptyPair(), { initialMode: "custom" });
    expect(screen.getByText(/As the first provider you set the price/)).toBeInTheDocument();
    expect(screen.getByText("Full range").closest("button")).not.toBeDisabled();
    expect(screen.getByText("Custom range").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("TOK / ERG")).toBeInTheDocument();
    await screen.findAllByText("ERG");
  });

  it("shows the create form and the selector when full range is chosen", async () => {
    const user = userEvent.setup();
    renderModal(emptyPair(), { initialMode: "custom" });
    await user.click(screen.getByText("Full range"));
    expect(poolSelect()).toHaveTextContent("New Crux pool…");
    expect(await screen.findByRole("button", { name: "Create pool" })).toBeInTheDocument();
  });
});

describe("pool selector", () => {
  it("defaults to the pair's pool, lists Crux pools it lacks, and ends with the create entry", async () => {
    const spectrum = poolFixture({});
    const lithos = poolFixture({ pool_id: "pool-lithos", pool_type: "lithos", tvl_erg: 1 });
    cpPools = [cruxPool("cp-30", 30), { ...cruxPool("pool-spectrum", 30), pool_type: "spectrum" }];
    const user = userEvent.setup();
    renderModal(pairWith([spectrum, lithos]));
    expect(poolSelect()).toHaveTextContent("Spectrum · 0.3%");

    await user.click(poolSelect());
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Spectrum · 0.3%",
      "Lithos · 0.3%",
      "Crux · 0.3%", // lp_fee_bps, not the rounded total fee_pct
      "New Crux pool…",
    ]);
    expect(options[1]).toHaveAttribute("aria-disabled", "true");
    expect(options[0]).not.toHaveAttribute("aria-disabled", "true");
  });

  it("starts on the create form when the only pool is not depositable", async () => {
    const lithos = poolFixture({ pool_id: "pool-lithos", pool_type: "lithos" });
    renderModal(pairWith([lithos]));
    expect(poolSelect()).toHaveTextContent("New Crux pool…");
    expect(await screen.findByRole("button", { name: "Create pool" })).toBeInTheDocument();
  });

  it("labels a crux_cp pool of the pair as Crux", async () => {
    renderModal(pairWith([poolFixture({ pool_id: "cp-1", pool_type: "crux_cp" })]));
    expect(poolSelect()).toHaveTextContent("Crux · 0.3%");
  });

  it("closes only the custom side while CL is paused", async () => {
    mockClStatus.mockReturnValue({ state: "killed", paused: true, message: "CL is paused", storagePeriodBlocks: null });
    renderModal(emptyPair(), { initialMode: "custom" });
    expect(screen.getByText("Custom range").closest("button")).toBeDisabled();
    expect(screen.getByText("Full range").closest("button")).not.toBeDisabled();
    expect(await screen.findByRole("button", { name: "Create pool" })).toBeInTheDocument();
  });
});

describe("fee tiers", () => {
  it("renders the tiers the API returns", async () => {
    renderModal(pairWith([]), { initialMode: "full" });
    for (const label of ["0.05%", "0.3%", "0.5%", "1%"]) {
      expect(await screen.findByRole("button", { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /^1\.5%/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("More").length).toBeGreaterThan(0);
    expect(
      screen.getByText("LP fee 0.3% + protocol fee 0.10% per swap"),
    ).toBeInTheDocument();
  });

  it("follows a changed tier list and omits a missing protocol fee", async () => {
    tiers = [
      { fee_bps: 10, lp_fee_pct: 0.1, protocol_fee_pct: null },
      { fee_bps: 70, lp_fee_pct: 0.7, protocol_fee_pct: null },
    ];
    renderModal(pairWith([]), { initialMode: "full" });
    expect(await screen.findByRole("button", { name: "0.1%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0.7%" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^0\.3%/ })).not.toBeInTheDocument();
    expect(screen.queryAllByText("More")).toHaveLength(0);
    // No 0.3% tier: the first one is the default.
    expect(screen.getByText("LP fee 0.1% per swap")).toBeInTheDocument();
  });

  it("switches to the deposit form of a tier that already has a pool", async () => {
    cpPools = [cruxPool("cp-50", 50)];
    const user = userEvent.setup();
    renderModal(pairWith([]), { initialMode: "full" });
    const tier = await screen.findByRole("button", { name: /^0\.5%\s*exists/ });
    await user.click(tier);
    expect(await screen.findByRole("button", { name: "Add Liquidity" })).toBeInTheDocument();
    expect(poolSelect()).toHaveTextContent("Crux · 0.5%");
    expect(
      screen.getByText("A Crux pool for this pair and fee already exists. You can add liquidity to it here."),
    ).toBeInTheDocument();
  });
});

describe("create form validation", () => {
  const fill = async (tok: string, erg: string) => {
    fireEvent.change(await screen.findByLabelText("TOK amount"), { target: { value: tok } });
    fireEvent.change(screen.getByLabelText("ERG amount"), { target: { value: erg } });
  };

  it("requires more than the 2.4 ERG storage-rent reserve", async () => {
    renderModal(pairWith([]), { initialMode: "full" });
    await fill("100", "2");
    expect(
      screen.getByText("An ERG pool needs more than 2.4 ERG, which stays locked as its storage-rent reserve"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create pool" })).toBeDisabled();
    await fill("100", "5");
    expect(screen.getByRole("button", { name: "Create pool" })).not.toBeDisabled();
  });

  it("flags amounts above the wallet balance", async () => {
    renderModal(pairWith([]), { initialMode: "full" });
    await fill("6000", "10");
    expect(screen.getByText("More than your wallet balance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create pool" })).toBeDisabled();
  });

  it("shows the opening price, LP preview, reserve and a market-gap warning", async () => {
    // Market: 1 TOK = 1 ERG (100 ERG / 100 TOK).
    renderModal(pairWith([poolFixture({})]), { initialMode: "full" });
    const user = userEvent.setup();
    await user.click(poolSelect());
    await user.click(await screen.findByRole("option", { name: "New Crux pool…" }));
    await fill("10", "10"); // 1 TOK = 1 ERG: no gap
    expect(screen.getByText("Opening price: 1 TOK = 1 ERG")).toBeInTheDocument();
    expect(screen.getByText("You receive: 31,622,776 LP tokens")).toBeInTheDocument();
    expect(screen.queryByText(/differs from the current market/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Locked as storage-rent reserve: 2.4 ERG (part of the ERG you deposit; it stays in the pool)",
      ),
    ).toBeInTheDocument();

    await fill("10", "13"); // +30%
    expect(
      screen.getByText(
        "The opening price differs from the current market by 30.0%. Arbitrage would move the pool to the market price at your cost.",
      ),
    ).toBeInTheDocument();
  });
});

describe("two-step create flow", () => {
  const MINT = { name: "mint", id: "mint-id" };
  const CREATE = { name: "create", id: "create-id" };
  const created = {
    mint_tx: MINT,
    create_tx: CREATE,
    mint_tx_id: "mint-id",
    create_tx_id: "create-id",
    pool_nft_id: "n".repeat(64),
    lp_token_id: "l".repeat(64),
    kind: "n2t",
    lp_tokens_received: 1_000_000_000,
    fee_bps: 30,
    pool_erg: 10_000_000_000,
    locked_erg: 2_400_000_000,
  };

  let order: string[];
  let signTx: jest.Mock;
  let submitTx: jest.Mock;

  beforeEach(() => {
    order = [];
    signTx = jest.fn(async (tx: { name: string; id: string }) => {
      order.push(`sign:${tx.name}`);
      return { ...tx, proofs: "x" };
    });
    submitTx = jest.fn(async () => "wallet-tx");
    window.ergoConnector = {
      nautilus: { getContext: async () => ({ sign_tx: signTx, submit_tx: submitTx }) },
    };
    (apiJson as jest.Mock).mockImplementation(async (path: string) => {
      order.push(`api:${path}`);
      if (path === "/dex/cp/create") return created;
      if (path === "/dex/submit_tx") return { tx_id: "mint-id" };
      throw new Error(`unexpected POST ${path}`);
    });
    (submitSignedTx as jest.Mock).mockImplementation(async () => {
      order.push("submit2");
      return "create-id";
    });
  });

  const setup = async () => {
    const props = renderModal(pairWith([]), { initialMode: "full" });
    fireEvent.change(await screen.findByLabelText("TOK amount"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("ERG amount"), { target: { value: "10" } });
    const user = userEvent.setup();
    return { props, user, create: () => user.click(screen.getByRole("button", { name: "Create pool" })) };
  };

  it("signs twice in order and submits the mint through the backend before the second signature", async () => {
    const { props, user, create } = await setup();
    await create();
    expect(await screen.findByText(/Pool created: TOK \/ ERG · 0\.3%/)).toBeInTheDocument();
    expect(order).toEqual([
      "api:/dex/cp/create",
      "sign:mint",
      "api:/dex/submit_tx",
      "sign:create",
      "submit2",
    ]);
    expect(submitTx).toHaveBeenCalledTimes(1); // the wallet leg of the mint
    const body = (apiJson as jest.Mock).mock.calls[0][1];
    expect(body).toMatchObject({
      token_x: ERG_TOKEN_ID,
      token_y: TOK,
      amount_x: 10_000_000_000,
      amount_y: 1_000_000,
      fee_bps: 30,
      user_addresses: ["9addr"],
    });
    expect(screen.getByText("LP tokens received: 1,000,000,000")).toBeInTheDocument();
    expect(screen.getByText("It appears in the list once the transaction confirms.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "mint-id..." })).toHaveAttribute(
      "href",
      "https://explorer.ergoplatform.com/en/transactions/mint-id",
    );
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onSuccess).toHaveBeenCalled();
  });

  it("sends nothing when the wallet changes the first transaction", async () => {
    signTx.mockImplementation(async (tx: { name: string }) => {
      order.push(`sign:${tx.name}`);
      return { id: "something-else" };
    });
    const { create } = await setup();
    await create();
    expect(
      await screen.findByText(
        "Your wallet changed the first transaction, so the second one no longer matches. Nothing was sent.",
      ),
    ).toBeInTheDocument();
    expect(order).toEqual(["api:/dex/cp/create", "sign:mint"]);
    expect(submitTx).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Retry step 2" })).not.toBeInTheDocument();
  });

  it("continues to step 2 when only the wallet's route accepted the mint", async () => {
    (apiJson as jest.Mock).mockImplementation(async (path: string) => {
      order.push(`api:${path}`);
      if (path === "/dex/cp/create") return created;
      throw new Error("Transaction is already in the mempool");
    });
    const { create } = await setup();
    await create();
    expect(await screen.findByText(/Pool created/)).toBeInTheDocument();
  });

  it("fails step 1 when neither route accepts the mint", async () => {
    (apiJson as jest.Mock).mockImplementation(async (path: string) => {
      if (path === "/dex/cp/create") return created;
      throw new Error("node refused");
    });
    submitTx.mockRejectedValue(new Error("wallet refused"));
    const { create } = await setup();
    await create();
    expect(await screen.findByText("node refused")).toBeInTheDocument();
    expect(signTx).toHaveBeenCalledTimes(1);
  });

  it("keeps the second transaction after a declined signature and retries the same one", async () => {
    let declined = false;
    signTx.mockImplementation(async (tx: { name: string }) => {
      order.push(`sign:${tx.name}`);
      if (tx.name === "create" && !declined) {
        declined = true;
        throw new Error("User declined");
      }
      return { id: tx === MINT ? "mint-id" : undefined };
    });
    const { user, create } = await setup();
    await create();
    expect(
      await screen.findByText(/The pool NFT is minted, but the pool was not created yet\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If it keeps failing, wait for the first transaction to confirm, then retry\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create pool" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry step 2" }));
    expect(await screen.findByText(/Pool created/)).toBeInTheDocument();

    const creates = (apiJson as jest.Mock).mock.calls.filter(([p]) => p === "/dex/cp/create");
    expect(creates).toHaveLength(1);
    const signed = signTx.mock.calls.map(([tx]) => tx);
    expect(signed).toEqual([MINT, CREATE, CREATE]);
    expect(signed[1]).toBe(signed[2]);
  });

  it("selects the existing pool on a 409", async () => {
    (apiJson as jest.Mock).mockImplementation(async (path: string) => {
      if (path !== "/dex/cp/create") throw new Error("unexpected");
      const err: Error & { status?: number; body?: unknown } = new Error("exists");
      err.status = 409;
      err.body = { pool_id: "cp-30" };
      throw err;
    });
    const { create } = await setup();
    cpPools = [cruxPool("cp-30", 30)]; // indexed between the form opening and the request
    await create();
    expect(await screen.findByRole("button", { name: "Add Liquidity" })).toBeInTheDocument();
    expect(poolSelect()).toHaveTextContent("Crux · 0.3%");
    expect(
      screen.getByText("A Crux pool for this pair and fee already exists. You can add liquidity to it here."),
    ).toBeInTheDocument();
    expect(signTx).not.toHaveBeenCalled();
  });
});
