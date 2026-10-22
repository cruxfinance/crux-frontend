/**
 * CL kill-switch status (`GET /dex/cl/status`) and the key-box storage-rent
 * age thresholds. Pure helpers; the fetching hook is in `useClStatus.ts`.
 */

export type ClStatusState = "live" | "killed" | "unavailable";

/** Response of `GET /dex/cl/status` (ci-api's `ClStatusDto`). */
export interface ClStatusResponse {
  live: boolean;
  state: ClStatusState;
  reason: string | null;
  payload_hash: string | null;
  payload_hashes_live: string[];
  config_nft_id: string | null;
  config_box_id: string | null;
  config_age_blocks: number | null;
  storage_period_blocks: number | null;
}

export interface ClStatusView {
  state: ClStatusState;
  /** True while add-liquidity and collect must be hidden or disabled. */
  paused: boolean;
  /** Banner text, `null` when CL is live. */
  message: string | null;
  storagePeriodBlocks: number | null;
}

export const KILLED_MESSAGE =
  "Concentrated liquidity is paused. You can still withdraw your positions.";
export const UNAVAILABLE_MESSAGE = "Concentrated liquidity is temporarily unavailable.";

/** Used when the status response lacks `storage_period_blocks` (4 years). */
export const DEFAULT_STORAGE_PERIOD_BLOCKS = 1_051_200;
export const BLOCK_SECONDS = 120;
export const WARN_FRACTION = 0.75;
export const URGENT_FRACTION = 0.95;

/** Maps the endpoint result to what the UI needs. `null` means the request
 * failed (network error, 503 when CL is not deployed, bad body): treated as
 * "unavailable". */
export function mapClStatus(raw: ClStatusResponse | null): ClStatusView {
  if (!raw) {
    return {
      state: "unavailable",
      paused: true,
      message: UNAVAILABLE_MESSAGE,
      storagePeriodBlocks: null,
    };
  }
  const storagePeriodBlocks = raw.storage_period_blocks ?? null;
  if (raw.state === "live" && raw.live !== false) {
    return { state: "live", paused: false, message: null, storagePeriodBlocks };
  }
  if (raw.state === "killed") {
    return { state: "killed", paused: true, message: KILLED_MESSAGE, storagePeriodBlocks };
  }
  return { state: "unavailable", paused: true, message: UNAVAILABLE_MESSAGE, storagePeriodBlocks };
}

export type KeyBoxSeverity = "ok" | "warning" | "urgent";

export interface KeyBoxWarning {
  severity: KeyBoxSeverity;
  ageBlocks: number;
  /** Approximate age in years (2 min blocks). */
  years: number;
  message: string;
}

export function blocksToYears(blocks: number): number {
  return (blocks * BLOCK_SECONDS) / (365 * 24 * 3600);
}

/** Warning level for a key box of `ageBlocks`, or `null` when there is
 * nothing to show (age unknown or below the warning threshold). */
export function keyBoxWarning(
  ageBlocks: number | null | undefined,
  storagePeriodBlocks: number | null | undefined,
): KeyBoxWarning | null {
  if (ageBlocks === null || ageBlocks === undefined || !Number.isFinite(ageBlocks)) return null;
  const period =
    storagePeriodBlocks && storagePeriodBlocks > 0
      ? storagePeriodBlocks
      : DEFAULT_STORAGE_PERIOD_BLOCKS;
  const fraction = ageBlocks / period;
  if (fraction < WARN_FRACTION) return null;
  const years = blocksToYears(ageBlocks);
  const approx = `about ${years.toFixed(1)} years`;
  const urgent = fraction >= URGENT_FRACTION;
  return {
    severity: urgent ? "urgent" : "warning",
    ageBlocks,
    years,
    message: urgent
      ? `Urgent: your position key hasn't moved in ${approx}. Withdraw and collect stop working at ${blocksToYears(period).toFixed(0)} years. Send it to yourself now.`
      : `Your position key hasn't moved in ${approx}. Send it to yourself to keep withdrawing and collecting possible.`,
  };
}
