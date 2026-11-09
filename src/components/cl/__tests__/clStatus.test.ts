import {
  DEFAULT_STORAGE_PERIOD_BLOCKS,
  KILLED_MESSAGE,
  UNAVAILABLE_MESSAGE,
  blocksToYears,
  keyBoxWarning,
  mapClStatus,
} from "../clStatus";
import type { ClStatusResponse } from "../clStatus";
import { buildKeyBoxSelfSend, MINER_FEE_ERGO_TREE } from "../clKeyBox";
import type { Eip12Box } from "../clKeyBox";

const base: ClStatusResponse = {
  live: true,
  state: "live",
  reason: null,
  payload_hash: "aa",
  payload_hashes_live: ["aa"],
  config_nft_id: "n",
  config_box_id: "b",
  config_age_blocks: 10,
  storage_period_blocks: 1_051_200,
};

describe("mapClStatus", () => {
  it("live is not paused and has no message", () => {
    const v = mapClStatus(base);
    expect(v).toMatchObject({ state: "live", paused: false, message: null });
    expect(v.storagePeriodBlocks).toBe(1_051_200);
  });
  it("killed pauses with the withdraw message", () => {
    expect(mapClStatus({ ...base, live: false, state: "killed" })).toMatchObject({
      state: "killed",
      paused: true,
      message: KILLED_MESSAGE,
    });
  });
  it("unavailable and failed requests pause softly", () => {
    expect(mapClStatus({ ...base, live: false, state: "unavailable" }).message).toBe(
      UNAVAILABLE_MESSAGE,
    );
    expect(mapClStatus(null)).toMatchObject({ state: "unavailable", paused: true });
  });
  it("a live state with live=false is not treated as live", () => {
    expect(mapClStatus({ ...base, live: false }).paused).toBe(true);
  });
});

describe("keyBoxWarning", () => {
  const P = 1_051_200;
  it("is null when unknown or below 75%", () => {
    expect(keyBoxWarning(null, P)).toBeNull();
    expect(keyBoxWarning(undefined, P)).toBeNull();
    expect(keyBoxWarning(Math.floor(P * 0.75) - 1, P)).toBeNull();
  });
  it("warns from 75% and goes urgent from 95%", () => {
    expect(keyBoxWarning(Math.ceil(P * 0.75), P)?.severity).toBe("warning");
    expect(keyBoxWarning(Math.ceil(P * 0.95) - 1, P)?.severity).toBe("warning");
    expect(keyBoxWarning(Math.ceil(P * 0.95), P)?.severity).toBe("urgent");
  });
  it("falls back to the 4-year default period", () => {
    expect(keyBoxWarning(DEFAULT_STORAGE_PERIOD_BLOCKS * 0.8, null)?.severity).toBe("warning");
  });
  it("converts blocks to years at 2 minutes per block", () => {
    expect(blocksToYears(P)).toBeCloseTo(4, 1);
    expect(keyBoxWarning(Math.ceil(P * 0.75), P)?.message).toContain("about 3.0 years");
  });
});

describe("buildKeyBoxSelfSend", () => {
  const box = (id: string, value: number, tokens: string[] = []): Eip12Box => ({
    boxId: id,
    transactionId: "t",
    index: 0,
    value: String(value),
    ergoTree: "0008cd" + id,
    assets: tokens.map((tokenId) => ({ tokenId, amount: "1" })),
    additionalRegisters: {},
    creationHeight: 1,
  });

  it("re-creates the key box minus the fee when it is big enough", () => {
    const tx = buildKeyBoxSelfSend([box("a", 5_000_000, ["pos"]), box("b", 9)], "pos", 100, 1_100_000);
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs[0]).toMatchObject({
      value: "3900000",
      ergoTree: "0008cda",
      creationHeight: 100,
      assets: [{ tokenId: "pos", amount: "1" }],
    });
    expect(tx.outputs[1].ergoTree).toBe(MINER_FEE_ERGO_TREE);
  });
  it("adds a second input when the key box cannot pay the fee", () => {
    const tx = buildKeyBoxSelfSend(
      [box("a", 1_000_000, ["pos"]), box("b", 50_000_000)],
      "pos",
      100,
      1_100_000,
    );
    expect(tx.inputs.map((i) => i.boxId)).toEqual(["a", "b"]);
    expect(tx.outputs[0].value).toBe("1000000");
    expect(tx.outputs[1].value).toBe("48900000");
  });
  it("throws when the key is missing or the fee cannot be paid", () => {
    expect(() => buildKeyBoxSelfSend([box("b", 5_000_000)], "pos", 1, 1_100_000)).toThrow(/not found/);
    expect(() =>
      buildKeyBoxSelfSend([box("a", 1_000_000, ["pos"])], "pos", 1, 1_100_000),
    ).toThrow(/Not enough ERG/);
  });
});
