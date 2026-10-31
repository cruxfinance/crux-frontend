/** @jest-environment node */
import { explorerApi } from "@server/services/axiosInstance";
import { explorerTx } from "@server/testUtils/fakePrisma";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { recordPaymentIntent } from "@server/utils/verifyPayment";
import { subscriptionRouter } from "@server/routers/subscription";
import {
  addPaymentInstrumentBalance,
  getPaymentInstrument,
} from "../paymentInstrument";

jest.mock("@server/prisma", () => {
  const { createFakePrisma } = require("@server/testUtils/fakePrisma");
  const fake = createFakePrisma();
  return { prisma: fake.prisma, __fake: fake };
});
jest.mock("@server/services/axiosInstance", () => ({
  explorerApi: { get: jest.fn() },
  cruxApi: { get: jest.fn() },
}));
jest.mock("@server/utils/checkTransactionStatus", () => ({
  checkTransactionStatus: jest.fn(),
}));
jest.mock("@pages/api/auth/[...nextauth]", () => ({
  getServerAuthSession: jest.fn(),
}));

const fake = (require("@server/prisma") as any).__fake;
const get = explorerApi.get as jest.Mock;
const status = checkTransactionStatus as jest.Mock;

const ADMIN = "9fAdminRecipientAddress";
const CRUX = "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365";
const SIGUSD = "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04";
const TX1 = "1".repeat(64);
const TX2 = "2".repeat(64);

const mkInstrument = (id: string, userId: string, tokenId: string | null) =>
  fake.seed("paymentInstrument", { id, userId, tokenId, balance: 0 });

const serveTx = (tx: ReturnType<typeof explorerTx>) =>
  get.mockImplementation(async (url: string) => {
    if (url.endsWith(tx.id)) return { data: tx };
    throw new Error("404");
  });

const confirmed = () => status.mockResolvedValue({ status: "CONFIRMED" });

// Build the tx for the user, claim it, then let the next read confirm it
const pay = async (piId: string, userId: string, txId: string) => {
  await recordPaymentIntent(txId, userId);
  await addPaymentInstrumentBalance({ paymentInstrumentId: piId, userId, txId });
  return getPaymentInstrument(piId);
};

beforeEach(() => {
  process.env.ADMIN_ADDRESS = ADMIN;
  get.mockReset();
  status.mockReset();
  for (const t of Object.values(fake.tables) as Map<string, any>[]) t.clear();
});

describe("crediting from on-chain truth", () => {
  it("credits an ERG payment by exactly the on-chain amount", async () => {
    mkInstrument("pi1", "alice", null);
    serveTx(explorerTx({ id: TX1, payments: [{ address: ADMIN, value: 2_500_000_000 }] }));
    confirmed();
    const pi = await pay("pi1", "alice", TX1);
    expect(pi.transactions[0].status).toBe("CONFIRMED");
    expect(Number(pi.transactions[0].amount)).toBe(2_500_000_000);
    expect(Number(pi.balance)).toBe(2_500_000_000);
  });

  it("credits a token payment", async () => {
    mkInstrument("pi1", "alice", CRUX);
    serveTx(
      explorerTx({
        id: TX1,
        payments: [{ address: ADMIN, assets: [{ tokenId: CRUX, amount: 123456 }] }],
      })
    );
    confirmed();
    const pi = await pay("pi1", "alice", TX1);
    expect(Number(pi.balance)).toBe(123456);
  });

  it("sums multiple outputs to the recipient", async () => {
    mkInstrument("pi1", "alice", CRUX);
    serveTx(
      explorerTx({
        id: TX1,
        payments: [
          { address: ADMIN, assets: [{ tokenId: CRUX, amount: 100 }] },
          { address: ADMIN, assets: [{ tokenId: CRUX, amount: 250 }] },
          { address: "9fOther", assets: [{ tokenId: CRUX, amount: 9999 }] },
        ],
      })
    );
    confirmed();
    expect(Number((await pay("pi1", "alice", TX1)).balance)).toBe(350);
  });

  it("ignores a forged amount sent by an old client", async () => {
    mkInstrument("pi1", "alice", CRUX);
    serveTx(
      explorerTx({
        id: TX1,
        payments: [{ address: ADMIN, assets: [{ tokenId: CRUX, amount: 1000 }] }],
      })
    );
    confirmed();
    await recordPaymentIntent(TX1, "alice");
    const caller = subscriptionRouter.createCaller({
      session: { user: { id: "alice" }, expires: "" },
      prisma: fake.prisma,
    } as any);
    await caller.addPaymentInstrumentBalance({
      paymentInstrumentId: "pi1",
      txId: TX1,
      address: "9fAnything",
      amount: 1_000_000,
    } as any);
    const pi = await getPaymentInstrument("pi1");
    expect(Number(pi.balance)).toBe(1000);
  });

  it("rejects an uppercase txId at the router before any upstream request", async () => {
    mkInstrument("pi1", "alice", null);
    const caller = subscriptionRouter.createCaller({
      session: { user: { id: "alice" }, expires: "" },
      prisma: fake.prisma,
    } as any);
    await expect(
      caller.addPaymentInstrumentBalance({
        paymentInstrumentId: "pi1",
        txId: TX1.replace(/1/g, "A"),
      })
    ).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(fake.tables.transaction.size).toBe(0);
  });

  it("rejects an uppercase txId in the service too", async () => {
    mkInstrument("pi1", "alice", null);
    await expect(
      addPaymentInstrumentBalance({
        paymentInstrumentId: "pi1",
        userId: "alice",
        txId: "A".repeat(64),
      })
    ).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
    expect(fake.tables.transaction.size).toBe(0);
  });
});

describe("failed payments", () => {
  it("marks a tx paying another address FAILED with no credit", async () => {
    mkInstrument("pi1", "alice", null);
    serveTx(explorerTx({ id: TX1, payments: [{ address: "9fSomeoneElse", value: 5_000_000_000 }] }));
    confirmed();
    const pi = await pay("pi1", "alice", TX1);
    expect(pi.transactions[0].status).toBe("FAILED");
    expect(Number(pi.transactions[0].amount)).toBe(0);
    expect(Number(pi.balance)).toBe(0);
  });

  it("marks a tx paying a different token FAILED on a token instrument", async () => {
    mkInstrument("pi1", "alice", CRUX);
    serveTx(
      explorerTx({
        id: TX1,
        payments: [{ address: ADMIN, assets: [{ tokenId: SIGUSD, amount: 99999 }] }],
      })
    );
    confirmed();
    const pi = await pay("pi1", "alice", TX1);
    expect(pi.transactions[0].status).toBe("FAILED");
    expect(Number(pi.balance)).toBe(0);
  });

  it("credits only the ERG value of a token-only tx on an ERG instrument", async () => {
    mkInstrument("pi1", "alice", null);
    serveTx(
      explorerTx({
        id: TX1,
        payments: [
          {
            address: ADMIN,
            value: 1_000_000,
            assets: [{ tokenId: CRUX, amount: 5_000_000 }],
          },
        ],
      })
    );
    confirmed();
    const pi = await pay("pi1", "alice", TX1);
    expect(Number(pi.balance)).toBe(1_000_000);
  });
});

describe("tx reuse and ownership", () => {
  it("rejects a tx already on another instrument and leaves balances alone", async () => {
    mkInstrument("pi1", "alice", null);
    mkInstrument("pi2", "alice", null);
    serveTx(explorerTx({ id: TX1, payments: [{ address: ADMIN, value: 2_000_000_000 }] }));
    confirmed();
    await pay("pi1", "alice", TX1);
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi2", userId: "alice", txId: TX1 })
    ).rejects.toThrow(/already been used/);
    expect(Number((await getPaymentInstrument("pi1")).balance)).toBe(2_000_000_000);
    expect(Number((await getPaymentInstrument("pi2")).balance)).toBe(0);
  });

  it("rejects a tx already used for a report", async () => {
    mkInstrument("pi1", "alice", null);
    await recordPaymentIntent(TX1, "alice");
    fake.seed("simpleTransaction", {
      txId: TX1,
      userId: "alice",
      paymentFor: "report",
      itemId: "r1",
    });
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "alice", txId: TX1 })
    ).rejects.toThrow(/already been used/);
    expect(fake.tables.transaction.size).toBe(0);
  });

  it("is idempotent on retry for the same instrument", async () => {
    mkInstrument("pi1", "alice", null);
    serveTx(explorerTx({ id: TX1, payments: [{ address: ADMIN, value: 2_000_000_000 }] }));
    confirmed();
    await pay("pi1", "alice", TX1);
    const retry = await addPaymentInstrumentBalance({
      paymentInstrumentId: "pi1",
      userId: "alice",
      txId: TX1,
    });
    expect(retry.transactionStatus.id).toBe(TX1);
    expect(fake.tables.transaction.size).toBe(1);
    expect(Number((await getPaymentInstrument("pi1")).balance)).toBe(2_000_000_000);
  });

  it("rejects when there is no payment intent", async () => {
    mkInstrument("pi1", "alice", null);
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "alice", txId: TX1 })
    ).rejects.toThrow();
    expect(fake.tables.transaction.size).toBe(0);
  });

  it("rejects when the intent belongs to another user", async () => {
    mkInstrument("pi1", "mallory", null);
    await recordPaymentIntent(TX1, "alice");
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "mallory", txId: TX1 })
    ).rejects.toThrow();
    expect(fake.tables.transaction.size).toBe(0);
  });

  it("rejects an expired intent", async () => {
    mkInstrument("pi1", "alice", null);
    fake.seed("keyValuePair", {
      key: `payment-intent-${TX1}`,
      value: "alice",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "alice", txId: TX1 })
    ).rejects.toThrow();
    expect(fake.tables.transaction.size).toBe(0);
  });

  it("does not let a later builder take over the intent", async () => {
    mkInstrument("pi1", "mallory", null);
    await recordPaymentIntent(TX1, "alice");
    await recordPaymentIntent(TX1, "mallory");
    await expect(
      addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "mallory", txId: TX1 })
    ).rejects.toThrow();
  });
});

describe("unverifiable transactions stay pending", () => {
  const cases: [string, () => void][] = [
    ["explorer failure", () => get.mockRejectedValue(new Error("503"))],
    ["explorer 404", () => get.mockRejectedValue({ response: { status: 404 } })],
    [
      "zero explorer confirmations",
      () =>
        serveTx(
          explorerTx({
            id: TX1,
            confirmations: 0,
            payments: [{ address: ADMIN, value: 1_000_000_000 }],
          })
        ),
    ],
  ];
  it.each(cases)("%s: PENDING, no credit, no throw, even past 30 minutes", async (_n, setup) => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mkInstrument("pi1", "alice", null);
    confirmed();
    setup();
    await recordPaymentIntent(TX1, "alice");
    await addPaymentInstrumentBalance({ paymentInstrumentId: "pi1", userId: "alice", txId: TX1 });
    fake.tables.transaction.get(TX1).createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pi = await getPaymentInstrument("pi1");
    expect(pi.transactions[0].status).toBe("PENDING");
    expect(Number(pi.balance)).toBe(0);
    warn.mockRestore();
  });
});
