## Context

The `OrderBook` component renders a single merged table with asks (reversed), spread indicator, and bids. The split view is the only available layout. The component has no concept of "view mode" — it always renders all three sections.

All data processing (merging real + virtual orders, computing cumulative depth) is handled by `useMemo` hooks independent of the render path, so the same computed data can drive any view.

## Goals / Non-Goals

**Goals:**
- Toggle between Buy (bids only), Sell (asks only), and Both (split) views
- Each view is independently scrollable within the order book container
- Depth bars and click behavior preserved in all views
- Default remains "Both"

**Non-Goals:**
- Changing the data fetching or merge logic
- Auto-scroll behavior to spread row — only applies in "Both" view
- Order book height or layout outside the component

## Decisions

### Decision 1: State management

**Chosen: `useState<"buy" | "sell" | "both">("both")` for view mode.**

- Simple, local state — no need for context or URL persistence
- Toggle resets to "both" when the trading pair changes (existing `useEffect` already re-fetches data)

### Decision 2: Toggle UI placement

**Chosen: `ToggleButtonGroup` above the table, full-width, between the order book header (or lack thereof) and the table.**

- Follows the same MUI pattern used elsewhere (MintWidget mode toggle, USE analytics time range)
- Compact: three small buttons that don't steal vertical space

### Decision 3: Conditional rendering

**Chosen: Conditional sections in the existing table, not separate table components.**

- Single `TableContainer`/`Table` with sections conditionally rendered — avoids duplicating the renderRow logic
- When view is "buy": render only bids section
- When view is "sell": render only asks section (reversed)
- When view is "both": render all three sections (current behavior)
- Spread row only rendered in "both" view

### Decision 4: Scroll behavior

**Chosen: Each view scrolls the full container naturally — no per-section scroll.**

- The container already has `overflow: "auto"` — Buy/Sell views occupy the same container but with fewer rows, so scrolling is natural
- Auto-scroll to spread only fires in "both" view; for Buy/Sell views, auto-scroll is suppressed (no spread row to target)

## Risks / Trade-offs

- **Risk:** Users might not discover the toggle. → **Mitigation:** Toggle is visible at all times, labeled clearly — standard UX pattern on every major exchange.
- **Risk:** Buy/Sell views lose the spread context. → **Mitigation:** This is a feature, not a bug — users select these views specifically to focus on one side. They can switch back to Both at any time.

## Open Questions

- None.
