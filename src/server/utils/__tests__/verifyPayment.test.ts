/** @jest-environment node */
import { explorerApi } from "@server/services/axiosInstance";
import { explorerTx } from "@server/testUtils/fakePrisma";
import {
  assertPaymentIntent,
  getPaidAmount,
  recordPaymentIntent,
  TX_ID_REGEX,
  txIdSchema,
  withPaymentClaim,
} from "../verifyPayment";

jest.mock("@server/prisma", () => {
  const { createFakePrisma } = require("@server/testUtils/fakePrisma");
  const fake = createFakePrisma();
  return { prisma: fake.prisma, __fake: fake };
});
jest.mock("@server/services/axiosInstance", () => ({
  explorerApi: { get: jest.fn() },
  cruxApi: { get: jest.fn() },
}));

const fake = (require("@server/prisma") as any).__fake;
const get = explorerApi.get as jest.Mock;

const ADMIN = "9fAdminRecipientAddress";
const TOKEN = "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365";
const OTHER_TOKEN =
  "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04";
const TX = "a".repeat(64);

beforeEach(() => {
  process.env.ADMIN_ADDRESS = ADMIN;
  get.mockReset();
  for (const t of Object.values(fake.tables) as Map<string, any>[]) t.clear();
});

describe("txId format", () => {
  it("accepts only lowercase 64-char hex", () => {
    expect(TX_ID_REGEX.test(TX)).toBe(true);
    expect(txIdSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(txIdSchema.safeParse("a".repeat(63)).success).toBe(false);
    expect(txIdSchema.safeParse("../" + "a".repeat(61)).success).toBe(false);
  });
});

describe("getPaidAmount", () => {
  it("sums ERG across multiple recipient outputs and ignores others", async () => {
    get.mockResolvedValue({
      data: explorerTx({
        id: TX,
        payments: [
          { address: ADMIN, value: 3_000_000_000 },
          { address: ADMIN, value: 2_000_000_000 },
          { address: "9fSomeoneElse", value: 7_000_000_000 },
          { address: ADMIN, value: 9_000_000_000, mainChain: false },
        ],
      }),
    });
    await expect(getPaidAmount(TX, null)).resolves.toBe(BigInt(5_000_000_000));
    expect(get.mock.calls[0][0]).toBe(`/api/v1/transactions/${TX}`);
  });

  it("sums only the requested token", async () => {
    get.mockResolvedValue({
      data: explorerTx({
        id: TX,
        payments: [
          { address: ADMIN, assets: [{ tokenId: TOKEN, amount: 400 }] },
          {
            address: ADMIN,
            assets: [
              { tokenId: TOKEN, amount: 100 },
              { tokenId: OTHER_TOKEN, amount: 999 },
            ],
          },
        ],
      }),
    });
    await expect(getPaidAmount(TX, TOKEN)).resolves.toBe(BigInt(500));
    await expect(getPaidAmount(TX, OTHER_TOKEN)).resolves.toBe(BigInt(999));
  });

  it("returns 0 when nothing was paid to the recipient", async () => {
    get.mockResolvedValue({
      data: explorerTx({ id: TX, payments: [{ address: "9fSomeoneElse" }] }),
    });
    await expect(getPaidAmount(TX, null)).resolves.toBe(BigInt(0));
  });

  it("throws on a bad id before making any request", async () => {
    await expect(getPaidAmount("A".repeat(64), null)).rejects.toThrow();
    await expect(getPaidAmount("../x", null)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });

  it("throws when ADMIN_ADDRESS is empty at call time", async () => {
    process.env.ADMIN_ADDRESS = "";
    await expect(getPaidAmount(TX, null)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });

  it("returns null on request failure, zero confirmations or id mismatch", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    get.mockRejectedValueOnce(new Error("404"));
    await expect(getPaidAmount(TX, null)).resolves.toBeNull();
    get.mockResolvedValueOnce({
      data: explorerTx({ id: TX, confirmations: 0, payments: [{ address: ADMIN }] }),
    });
    await expect(getPaidAmount(TX, null)).resolves.toBeNull();
    get.mockResolvedValueOnce({
      data: explorerTx({ id: "b".repeat(64), payments: [{ address: ADMIN }] }),
    });
    await expect(getPaidAmount(TX, null)).resolves.toBeNull();
    warn.mockRestore();
  });

  it("returns null for an unsafe integer instead of crediting it", async () => {
    get.mockResolvedValue({
      data: explorerTx({
        id: TX,
        payments: [{ address: ADMIN, value: 2 ** 60 }],
      }),
    });
    await expect(getPaidAmount(TX, null)).resolves.toBeNull();
  });
});

describe("payment intent", () => {
  it("first writer wins", async () => {
    await recordPaymentIntent(TX, "alice");
    await recordPaymentIntent(TX, "mallory");
    await expect(assertPaymentIntent(TX, "alice")).resolves.toBeUndefined();
    await expect(assertPaymentIntent(TX, "mallory")).rejects.toThrow();
  });

  it("rejects when missing", async () => {
    await expect(assertPaymentIntent(TX, "alice")).rejects.toThrow();
  });

  it("rejects when expired", async () => {
    fake.seed("keyValuePair", {
      key: `payment-intent-${TX}`,
      value: "alice",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(assertPaymentIntent(TX, "alice")).rejects.toThrow();
  });

  it("sets a one hour expiry", async () => {
    await recordPaymentIntent(TX, "alice");
    const row = fake.tables.keyValuePair.get(`payment-intent-${TX}`);
    const delta = row.expiresAt.getTime() - Date.now();
    expect(delta).toBeGreaterThan(59 * 60 * 1000);
    expect(delta).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});

describe("withPaymentClaim", () => {
  it("runs the claim for the intent owner and releases the lock", async () => {
    await recordPaymentIntent(TX, "alice");
    await expect(withPaymentClaim(TX, "alice", async () => 42)).resolves.toBe(42);
    const lock = fake.tables.transactionalLock.get(`paymentClaim.${TX}`);
    expect(lock.lock).toBeNull();
  });

  it("rejects without intent or with another user's intent, without running the claim", async () => {
    const claim = jest.fn(async () => 1);
    await expect(withPaymentClaim(TX, "alice", claim)).rejects.toThrow();
    await recordPaymentIntent(TX, "bob");
    await expect(withPaymentClaim(TX, "alice", claim)).rejects.toThrow(
      /not built for this user/
    );
    expect(claim).not.toHaveBeenCalled();
    expect(fake.tables.transactionalLock.get(`paymentClaim.${TX}`).lock).toBeNull();
  });

  it("rejects a tx already used by a transaction or simpleTransaction row", async () => {
    await recordPaymentIntent(TX, "alice");
    fake.seed("transaction", { id: TX, paymentInstrumentId: "pi-x", amount: 1 });
    await expect(withPaymentClaim(TX, "alice", async () => 1)).rejects.toThrow(
      /already been used/
    );
    fake.tables.transaction.clear();
    fake.seed("simpleTransaction", { txId: TX, userId: "bob", itemId: "r" });
    await expect(withPaymentClaim(TX, "alice", async () => 1)).rejects.toThrow(
      /already been used/
    );
    // the error does not name the other user
    await expect(withPaymentClaim(TX, "alice", async () => 1)).rejects.not.toThrow(/bob/);
  });
});
