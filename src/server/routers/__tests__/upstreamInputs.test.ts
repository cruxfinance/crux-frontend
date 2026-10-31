import { dexyApi } from "@server/services/dexyApi";
import { cruxApi } from "@server/services/axiosInstance";
import { checkTransactionStatus } from "@server/utils/checkTransactionStatus";
import { getUnsignedTransaction } from "@server/utils/ergoClient";
import axios from "axios";
import { dexyRouter } from "../dexy";
import { transactionRouter } from "../transaction";

jest.mock("@pages/api/auth/[...nextauth]", () => ({
  getServerAuthSession: jest.fn(),
}));
jest.mock("@server/prisma", () => ({ prisma: {} }));
jest.mock("@server/services/exchangeRateApi", () => ({
  getExchangeRate: jest.fn(),
}));
jest.mock("@server/utils/ergoClient", () => ({
  getUnsignedTransaction: jest.fn(),
}));
jest.mock("@lib/utils/icons", () => ({ checkLocalIcon: jest.fn() }));
jest.mock("nanoid", () => ({ nanoid: () => "id" }));
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    create: jest.fn(() => ({ get: jest.fn() })),
    isAxiosError: jest.fn(() => false),
  },
}));
jest.mock("@server/services/dexyApi", () => ({
  dexyApi: { getAnalytics: jest.fn(), getAnalyticsHistory: jest.fn() },
}));

const context = { session: null, prisma: {}, user: null } as any;
const dexy = dexyRouter.createCaller(context);
const transaction = transactionRouter.createCaller(context);

const traversals = [
  "..",
  "../../boxes",
  "../../boxes?limit=1",
  "..%2f..%2fetc%2fpasswd",
  "USE/../../crux/positions",
  "USE?x=1",
  "",
];
const txId = "a".repeat(64);

beforeEach(() => jest.clearAllMocks());

describe("dexy instanceName", () => {
  it.each(["USE", "DexyGOLD"])("accepts %s", async (instanceName) => {
    await dexy.getAnalytics({ instanceName });
    expect(dexyApi.getAnalytics).toHaveBeenCalledWith(instanceName);
  });

  it("still defaults to USE", async () => {
    await dexy.getAnalytics({});
    expect(dexyApi.getAnalytics).toHaveBeenCalledWith("USE");
  });

  it.each(traversals)("rejects %j", async (instanceName) => {
    await expect(dexy.getAnalytics({ instanceName })).rejects.toThrow();
    await expect(
      dexy.getHistory({
        instanceName,
        metric: "erg_tvl",
        from: 0,
        to: 1,
        resolution: "1d",
      }),
    ).rejects.toThrow();
    expect(dexyApi.getAnalytics).not.toHaveBeenCalled();
    expect(dexyApi.getAnalyticsHistory).not.toHaveBeenCalled();
  });
});

describe("transaction inputs", () => {
  it("polls a real transaction id", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { num_confirmations: 2 },
    });
    await expect(
      transaction.checkMobileSuccess({ transactionId: txId }),
    ).resolves.toBe(2);
  });

  it.each(traversals)("rejects %j as a transaction id", async (transactionId) => {
    await expect(
      transaction.checkMobileSuccess({ transactionId }),
    ).rejects.toThrow();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it.each(traversals)("rejects %j as a token id", async (tokenId) => {
    await expect(
      transaction.fetchTokenInfoWithPrice({ tokenId }),
    ).rejects.toThrow(/invalid_string|Invalid/);
  });

  it.each(traversals)("rejects %j as an address", async (address) => {
    await expect(
      transaction.getTransaction({ address, amount: [] }),
    ).rejects.toThrow();
    expect(getUnsignedTransaction).not.toHaveBeenCalled();
  });
});

describe("checkTransactionStatus", () => {
  it("looks up a real transaction id", async () => {
    (cruxApi.get as jest.Mock).mockResolvedValue({
      data: { num_confirmations: 1 },
    });
    await expect(checkTransactionStatus(txId)).resolves.toEqual({
      status: "CONFIRMED",
    });
  });

  it.each(traversals)("never sends %j upstream", async (id) => {
    await expect(checkTransactionStatus(id)).resolves.toEqual({
      status: "NOT_FOUND",
    });
    expect(cruxApi.get).not.toHaveBeenCalled();
  });
});
