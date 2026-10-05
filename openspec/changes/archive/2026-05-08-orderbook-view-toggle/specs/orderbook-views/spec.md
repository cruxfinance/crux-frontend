## ADDED Requirements

### Requirement: Order book supports view toggle

The system SHALL provide a `ToggleButtonGroup` in the order book component allowing users to switch between "Sell", "Buy", and "Both" views. The default view SHALL be "Both".

#### Scenario: Default view is both
- **WHEN** the order book component mounts
- **THEN** the view toggle SHALL show "Both" as selected and both asks and bids SHALL be rendered

#### Scenario: Switch to sell-only view
- **WHEN** user selects "Sell" on the toggle
- **THEN** only asks SHALL be rendered, ordered with highest ask at top, and bids SHALL be hidden

#### Scenario: Switch to buy-only view
- **WHEN** user selects "Buy" on the toggle
- **THEN** only bids SHALL be rendered, ordered descending by price, and asks SHALL be hidden

#### Scenario: Switch back to both view
- **WHEN** user selects "Both" on the toggle after being in a single-side view
- **THEN** both asks (reversed) and bids SHALL be rendered with the spread indicator between them

### Requirement: Spread indicator hidden in single-side views

The system SHALL hide the spread indicator row when the view is "Sell" or "Buy", since cross-side spread has no meaning when only one side is displayed.

#### Scenario: Spread shown in both view
- **WHEN** the view is "Both" and best bid/ask prices are available
- **THEN** the spread indicator SHALL be rendered between asks and bids

#### Scenario: Spread hidden in buy view
- **WHEN** the view is "Buy"
- **THEN** the spread indicator SHALL NOT be rendered

#### Scenario: Spread hidden in sell view
- **WHEN** the view is "Sell"
- **THEN** the spread indicator SHALL NOT be rendered

### Requirement: Order book scrollable in all views

The system SHALL maintain scrollable behavior in all three views. The container overflow SHALL remain `auto` regardless of the selected view.

#### Scenario: Sell view scrolls independently
- **WHEN** the view is "Sell" and the ask rows exceed the container height
- **THEN** the container SHALL be vertically scrollable

#### Scenario: Buy view scrolls independently
- **WHEN** the view is "Buy" and the bid rows exceed the container height
- **THEN** the container SHALL be vertically scrollable

### Requirement: Auto-scroll suppressed in single-side views

The system SHALL suppress the auto-scroll-to-spread behavior when the view is "Sell" or "Buy", since the spread row is not rendered in those views.

#### Scenario: No auto-scroll in sell view
- **WHEN** the view is "Sell" and new order book data arrives
- **THEN** no auto-scroll SHALL occur

#### Scenario: No auto-scroll in buy view
- **WHEN** the view is "Buy" and new order book data arrives
- **THEN** no auto-scroll SHALL occur

#### Scenario: Auto-scroll preserved in both view
- **WHEN** the view is "Both" and new order book data arrives on initial load
- **THEN** the container SHALL auto-scroll to the spread row (existing behavior preserved)

### Requirement: Depth bars and click behavior preserved in all views

The system SHALL render depth visualization bars and preserve the `onPriceClick` handler in all three views.

#### Scenario: Depth bars visible in all views
- **WHEN** any view is active ("Sell", "Buy", or "Both")
- **THEN** depth bars SHALL be rendered behind each row proportional to cumulative volume

#### Scenario: Price click works in all views
- **WHEN** user clicks a price row in any view
- **THEN** the `onPriceClick` callback SHALL be invoked with the row's price and amount

### Requirement: View resets on pair change

The system SHALL reset the view to "Both" when the trading pair (baseToken or quoteToken) changes, ensuring consistent initial state.

#### Scenario: View resets after pair switch
- **WHEN** user is in "Buy" view and navigates to a different trading pair
- **THEN** the view SHALL reset to "Both" for the new pair
