## 1. View State & Toggle

- [x] 1.1 Add view mode state to OrderBook component: `const [viewMode, setViewMode] = useState<"buy" | "sell" | "both">("both")`
- [x] 1.2 Add `ToggleButtonGroup` above the `<TableContainer>` with three options: "Sell" (value `"sell"`), "Buy" (value `"buy"`), "Both" (value `"both"`). Use `size="small"` and `fullWidth`
- [x] 1.3 Import `ToggleButtonGroup` and `ToggleButton` from `@mui/material`
- [x] 1.4 Reset `viewMode` to `"both"` when `baseToken` changes (in the existing `useEffect` that calls `fetchOrderBook`)

## 2. Conditional Rendering

- [x] 2.1 Wrap asks section (lines 542-548) in conditional: render only when `viewMode === "sell" || viewMode === "both"`
- [x] 2.2 Wrap spread indicator section (lines 551-584) in conditional: render only when `viewMode === "both"` (already guarded by `bestAsk && bestBid`, add the viewMode check)
- [x] 2.3 Wrap bids section (lines 586-587) in conditional: render only when `viewMode === "buy" || viewMode === "both"`

## 3. Auto-Scroll Adjustment

- [x] 3.1 Suppress auto-scroll to spread when `viewMode !== "both"` in the existing `useEffect` that handles auto-scroll (lines 387-396)

## 4. Verification

- [x] 4.1 Visual check: click "Sell" — only asks visible, scrollable, depth bars present, spread hidden
- [x] 4.2 Visual check: click "Buy" — only bids visible, scrollable, depth bars present, spread hidden
- [x] 4.3 Visual check: click "Both" — full split view with spread indicator, auto-scroll to spread works
- [x] 4.4 Visual check: switch trading pair — view resets to "Both"
- [x] 4.5 Run `npm run build` to verify no compilation errors
