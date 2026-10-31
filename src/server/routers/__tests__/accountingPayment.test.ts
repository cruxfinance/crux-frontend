/** @jest-environment node */
import { explorerApi } from "@server/services/axiosInstance";
import { explorerTx } from "@server/testUtils/fakePrisma";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { recordPaymentIntent } from "@server/utils/verifyPayment";
import { accountingRouter } from "../accounting";

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
jest.mock("@server/utils/tokenPrice", () => ({
  getTokenPriceInfo: jest.fn(async () => ({
    tokenId: null,
    tokenPrice: 2, // USD per ERG
    tokenDecimals: 9,
  })),
}));
jest.mock("@server/services/accountingApi", () => ({ accountingApi: {} }));
jest.mock("@pages/api/auth/[...nextauth]", () => ({
  getServerAuthSession: jest.fn(),
}));

const fake = (require("@server/prisma") as any).__fake;
const get = explorerApi.get as jest.Mock;
const status = checkTransactionStatus as jest.Mock;

const ADMIN = "9fAdminRecipientAddress";
const ERG_ID = "0".repeat(64);
const TX1 = "1".repeat(64);

// DEFAULT level report costs 40 USD; at 2 USD/ERG that is 20 ERG, 80% = 16 ERG
const ENOUGH = 16_000_000_000;

const caller = (userId = "alice", privilegeLevel = "DEFAULT") =>
  accountingRouter.createCaller({
    session: { user: { id: userId, privilegeLevel }, expires: "" },
    prisma: fake.prisma,
  } as any);

const mkReport = (id: string, userId = "alice") =>
  fake.seed("report", { id, userId, status: "PAYMENT_PENDING" });

const mkClaim = (reportId: string, extra: Record<string, any> = {}) =>
  fake.seed("simpleTransaction", {
    txId: TX1,
    userId: "alice",
    paymentFor: "report",
    itemId: reportId,
    amounts: [{ tokenId: ERG_ID, amount: ENOUGH }],
    ...extra,
  });

const serve = (payments: Parameters<typeof explorerTx>[0]["payments"]) =>
  get.mockResolvedValue({ data: explorerTx({ id: TX1, payments }) });

const reportStatus = (id: string) => fake.tables.report.get(id).status;

beforeEach(() => {
  process.env.ADMIN_ADDRESS = ADMIN;
  get.mockReset();
  status.mockReset();
  status.mockResolvedValue({ status: "CONFIRMED" });
  for (const t of Object.values(fake.tables) as Map<string, any>[]) t.clear();
});

describe("verifyReportPurchaseTransaction", () => {
  it("makes the report AVAILABLE for a valid payment", async () => {
    mkReport("r1");
    mkClaim("r1");
    serve([{ address: ADMIN, value: ENOUGH }]);
    const res: any = await caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" });
    expect(res.status).toBe("CONFIRMED");
    expect(reportStatus("r1")).toBe("AVAILABLE");
  });

  it("rejects a tx linked to a different report", async () => {
    mkReport("r1");
    mkReport("r2");
    mkClaim("r1");
    serve([{ address: ADMIN, value: ENOUGH }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r2" })
    ).rejects.toThrow(/not found/);
    expect(reportStatus("r2")).toBe("PAYMENT_PENDING");
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
  });

  it("rejects a tx paying the wrong recipient and keeps the report pending", async () => {
    mkReport("r1");
    mkClaim("r1");
    serve([{ address: "9fSomeoneElse", value: 50_000_000_000 }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" })
    ).rejects.toThrow();
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
  });

  it("rejects an underpayment", async () => {
    mkReport("r1");
    mkClaim("r1");
    serve([{ address: ADMIN, value: 1_000_000_000 }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" })
    ).rejects.toThrow(/insufficient/);
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
  });

  it("rejects a newer duplicate claimant but accepts the oldest", async () => {
    mkReport("r1");
    mkReport("r2");
    mkClaim("r1");
    mkClaim("r2");
    serve([{ address: ADMIN, value: ENOUGH }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r2" })
    ).rejects.toThrow(/already been used/);
    expect(reportStatus("r2")).toBe("PAYMENT_PENDING");
    await caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" });
    expect(reportStatus("r1")).toBe("AVAILABLE");
  });

  it("rejects a tx already claimed by a payment instrument", async () => {
    mkReport("r1");
    mkClaim("r1");
    fake.seed("transaction", { id: TX1, paymentInstrumentId: "pi1", amount: 1 });
    serve([{ address: ADMIN, value: ENOUGH }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" })
    ).rejects.toThrow(/already been used/);
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
  });

  it("rejects a token that is not accepted", async () => {
    mkReport("r1");
    mkClaim("r1", { amounts: [{ tokenId: "f".repeat(64), amount: 1 }] });
    serve([{ address: ADMIN, value: ENOUGH }]);
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" })
    ).rejects.toThrow();
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
  });

  it("stays PENDING when the explorer cannot verify the tx", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mkReport("r1");
    mkClaim("r1");
    get.mockRejectedValue(new Error("503"));
    const res: any = await caller().verifyReportPurchaseTransaction({ txId: TX1, reportId: "r1" });
    expect(res).toEqual({ status: "PENDING" });
    expect(reportStatus("r1")).toBe("PAYMENT_PENDING");
    warn.mockRestore();
  });

  it("rejects an uppercase txId before any lookup", async () => {
    await expect(
      caller().verifyReportPurchaseTransaction({ txId: "A".repeat(64), reportId: "r1" })
    ).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
});

describe("initiateReportPayment", () => {
  const input = {
    taxYear: 2025,
    txId: TX1,
    paymentAmounts: [{ amount: ENOUGH, tokenId: ERG_ID }],
    wallets: [{ addresses: ["9fSender"], name: "w" }],
  };

  it("creates the report and claim row for the intent owner", async () => {
    await recordPaymentIntent(TX1, "alice");
    const res = await caller().initiateReportPayment(input);
    expect(res.report.status).toBe("PAYMENT_PENDING");
    expect(fake.tables.simpleTransaction.size).toBe(1);
    expect(fake.tables.report.size).toBe(1);
  });

  it("surfaces the rejection without creating anything when the intent is someone else's", async () => {
    await recordPaymentIntent(TX1, "bob");
    await expect(caller().initiateReportPayment(input)).rejects.toThrow(
      /not built for this user/
    );
    expect(fake.tables.simpleTransaction.size).toBe(0);
    expect(fake.tables.report.size).toBe(0);
  });

  it("rejects a tx already claimed by a payment instrument", async () => {
    await recordPaymentIntent(TX1, "alice");
    fake.seed("transaction", { id: TX1, paymentInstrumentId: "pi1", amount: 1 });
    await expect(caller().initiateReportPayment(input)).rejects.toThrow(
      /already been used/
    );
    expect(fake.tables.report.size).toBe(0);
  });

  it("rejects a second claim on the same tx", async () => {
    await recordPaymentIntent(TX1, "alice");
    await caller().initiateReportPayment(input);
    await expect(caller().initiateReportPayment(input)).rejects.toThrow(
      /already been used/
    );
    expect(fake.tables.report.size).toBe(1);
  });
});
