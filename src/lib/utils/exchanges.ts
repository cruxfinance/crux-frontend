/**
 * Exchange codes returned by ci-api `/dex/order_history`. Codes 0-4 come from
 * `dex.exchanges`; code 5 is served by the API without a table row, so the
 * label lives here.
 */
export const CL_EXCHANGE_CODE = 5;

const EXCHANGE_LABELS: Record<number, string> = {
  0: "Spectrum",
  1: "Spectrum",
  2: "Spectrum",
  3: "Spectrum",
  4: "TradeHouse",
  [CL_EXCHANGE_CODE]: "Crux CL",
};

export const isClExchange = (code: number | undefined): boolean => code === CL_EXCHANGE_CODE;

export function exchangeLabel(code: number | undefined): string {
  if (code === undefined) return "Unknown";
  return EXCHANGE_LABELS[code] ?? "Unknown";
}
