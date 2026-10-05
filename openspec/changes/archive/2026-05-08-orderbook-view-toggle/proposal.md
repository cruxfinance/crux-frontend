## Why

The current order book only shows a split view with asks above and bids below, separated by the spread indicator. Power users expect the ability to focus on either buy-side (bids) or sell-side (asks) liquidity in isolation, as well as the combined split view. All exchanges provide this as standard UX — Crux's order book should match this expectation.

## What Changes

- **View toggle**: A `ToggleButtonGroup` added above the order book table with three options: "Sell" (asks only), "Buy" (bids only), "Both" (split — current behavior)
- **Buy view**: Bids table only, ordered descending by price, with depth visualization and full scrolling
- **Sell view**: Asks table only, reversed (highest ask at top), with depth visualization and full scrolling
- **Split view**: Current behavior unchanged — asks on top + spread indicator + bids on bottom
- **Spread indicator**: Only shown in "Both" view; hidden in Buy/Sell views since there's no cross-side spread to display
- **Default**: "Both" (split view) remains the default to preserve existing UX

## Capabilities

### New Capabilities
- `orderbook-views`: View toggle (Buy/Sell/Both) for the trade order book component, enabling focused bid or ask liquidity display with independent scrolling per view.

### Modified Capabilities
- None — this is a UI enhancement to an existing component, not a spec-level requirement change.

## Impact

- `src/components/trade/OrderBook.tsx` — new view toggle UI state and conditional rendering logic
- No backend changes — the order book data fetch and merge logic remain unchanged
