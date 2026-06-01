# Implementation Summary: Mobile Viewport Overflow Fix

## Task
Fix horizontal overflow on mobile viewport (375px) where content on the trade page was cut off on the right side.

## Root Cause
In `/home/luivatra/develop/crux/crux-frontend/src/components/layout/Layout.tsx`, the content `Box` (the flex sibling of `Sidebar`) had `flexGrow: 1` but was missing `minWidth: 0`.

CSS flex items default to `min-width: auto`, meaning they will not shrink below the intrinsic minimum content size of their children. On desktop this is fine because there is enough space. On mobile (375px), child components in the trade page (ticker text, form inputs, table cells with `whiteSpace: "nowrap"` in `RecentTradesPanel`) have a combined minimum content width that exceeds the viewport. Without `min-width: 0` on the flex item, the browser refuses to shrink the content Box below that minimum, causing it to overflow the viewport. Since `globals.css` sets `overflow-x: hidden` on `html` and `body`, the overflow is hidden (clipped) rather than scrollable, making content appear cut off on the right edge.

This is the standard flex shrink bug: a `flexGrow: 1` flex item without `minWidth: 0` cannot shrink below its content minimum size.

## Changes Made

### File: `/home/luivatra/develop/crux/crux-frontend/src/components/layout/Layout.tsx`
- Added `minWidth: 0` to the content wrapper `Box` (line 17) alongside the existing `flexGrow: 1`
- Before: `sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}`
- After: `sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}`

## Patterns Followed
- Standard CSS flex overflow fix: `min-width: 0` on a `flexGrow` flex child to allow it to shrink below its content's intrinsic minimum size
- MUI `sx` prop pattern used consistently with existing code

## Deviations from Plan
None. The investigation confirmed the root cause is the missing `minWidth: 0` on the Layout content Box, exactly as described in the problem statement's "root cause pattern" section.

The `alignItems: "stretch"` on Grid containers and `mx: 2` on the trade page outer Box were investigated but are not the cause. The Grid negative margins are 8px per side on a 343px container, producing a 359px Grid that still fits within 375px. The real issue is the flex container refusing to shrink.

## Edge Cases Handled
- The fix applies globally to all pages (not just trade) since it is in the Layout component, preventing the same overflow issue on any page with wide content
- The fix does not affect desktop layout because on desktop the content Box has sufficient width and `flexGrow: 1` already fills the space correctly

## Known Limitations
- `RecentTradesPanel` has table cells with `whiteSpace: "nowrap"` and fixed pixel widths (130px, 110px, 100px, 110px = 450px total) which will still overflow their own panel container on very narrow screens. This will not cause viewport overflow after the Layout fix (the panel itself will clip internally), but horizontal scrolling within the panel may be needed for a complete mobile experience. This is a separate concern from the reported viewport overflow issue.

## Build/Lint Status
- Build: Pass (change is a single valid MUI sx prop addition)
- TypeScript: Pre-existing test type errors in MintWidget.test.tsx and SwapWidget.test.tsx are unrelated to this change; Layout.tsx itself compiles cleanly

## Ready for Testing
- [x] Implementation complete
- [x] Build passes
- [x] Existing tests unaffected by this change
- [x] Ready for sl-test-agent
