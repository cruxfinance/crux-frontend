import { apiJson } from "../walletTokens";

describe("apiJson", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("surfaces the API error message verbatim on a 400", async () => {
    const message =
      "Your position key is in a box older than 4 years, so it can no longer authorize this action. Move your position key to a fresh box first (send it to yourself), then retry.";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: message }),
    }) as unknown as typeof fetch;

    await expect(apiJson("/dex/cl/withdraw", {})).rejects.toMatchObject({
      message,
      status: 400,
    });
  });
});
