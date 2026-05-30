import { IChartWidgetApi, EntityId } from "./charting_library";

interface TradeMarkerData {
  shapeId: EntityId;
  trade: DexOrder;
  price: number;
  adjustedPrice: number; // The actual position of the arrow on the chart
  time: number;
}

export interface TradeMarkerManager {
  loadMarkers: (from: number, to: number) => Promise<void>;
  clearMarkers: () => void;
  setEnabled: (enabled: boolean) => void;
  destroy: () => void;
}

export async function fetchUserTrades(
  tokenId: string,
  addresses: string[],
  fromTime?: number,
  toTime?: number,
): Promise<DexOrder[]> {
  const addressParam = encodeURIComponent(addresses.join(","));
  const endpoint = `${process.env.CRUX_API}/dex/order_history?token_id=${encodeURIComponent(tokenId)}&addresses=${addressParam}&offset=0&limit=500`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.error("Failed to fetch user trades");
      return [];
    }

    const trades: DexOrder[] = await response.json();

    // Filter by time range if provided (times in milliseconds)
    if (fromTime && toTime) {
      return trades.filter((trade) => {
        const tradeTime = trade.chain_time;
        return tradeTime >= fromTime && tradeTime <= toTime;
      });
    }

    return trades;
  } catch (error) {
    console.error("Error fetching user trades:", error);
    return [];
  }
}

function createTooltipElement(): HTMLDivElement {
  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: absolute;
    display: none;
    background: rgba(30, 34, 45, 0.95);
    border: 1px solid #3B5959;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    color: #fff;
    pointer-events: none;
    z-index: 10000;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  return tooltip;
}

export function createTradeMarkerManager(
  chart: IChartWidgetApi,
  tokenId: string,
  addresses: string[],
  chartContainer: HTMLElement,
  chartSymbol: string,
): TradeMarkerManager {
  const markers: TradeMarkerData[] = [];
  let isDestroyed = false;
  let isEnabled = true;

  // The chart datafeed always returns prices in canonical quote/base direction.
  // When the symbol is {BASE}_{QUOTE} (e.g. "ERG_USE") the chart inverts the
  // OHLC data. We must invert marker prices to match the chart axis.
  const isInverted = chartSymbol.includes("_");

  // Create tooltip element
  const tooltip = createTooltipElement();
  chartContainer.style.position = "relative";
  chartContainer.appendChild(tooltip);

  // Track crosshair position and check proximity to markers
  const crosshairMoved = chart.crossHairMoved();
  const crosshairCallback = (params: { time?: number; price?: number; offsetX?: number; offsetY?: number }) => {
      if (isDestroyed || !params.time || !params.price) {
        tooltip.style.display = "none";
        return;
      }

      // Get current chart resolution to determine candle matching
      const resolution = chart.resolution();

      // Function to get candle identifier for a given timestamp
      const getCandleId = (timestamp: number): number => {
        const date = new Date(timestamp * 1000);

        if (resolution.includes("M")) {
          // Monthly: use year * 12 + month
          return date.getUTCFullYear() * 12 + date.getUTCMonth();
        } else if (resolution.includes("W")) {
          // Weekly: get Monday of the week as reference
          const dayOfWeek = date.getUTCDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const monday = new Date(date);
          monday.setUTCDate(date.getUTCDate() + mondayOffset);
          monday.setUTCHours(0, 0, 0, 0);
          return Math.floor(monday.getTime() / 1000 / 86400);
        } else if (resolution.includes("D")) {
          // Daily: use day number
          const days = parseInt(resolution) || 1;
          return Math.floor(timestamp / (days * 86400));
        } else {
          // Minutes/Hours
          const minutes = parseInt(resolution) || 1;
          return Math.floor(timestamp / (minutes * 60));
        }
      };

      // Get candle ID for crosshair position
      const crosshairCandle = getCandleId(params.time);

      // Filter markers that fall within the same candle
      const nearbyTimeMarkers = markers.filter((m) => {
        const markerCandle = getCandleId(m.time);
        return crosshairCandle === markerCandle;
      });

      // Find the marker closest to the crosshair price (using adjustedPrice where arrow is drawn)
      let nearbyMarker: TradeMarkerData | undefined;
      const crosshairPrice = params.price!;
      if (nearbyTimeMarkers.length > 0) {
        const closest = nearbyTimeMarkers.reduce((prev, curr) => {
          const prevDiff = Math.abs(prev.adjustedPrice - crosshairPrice);
          const currDiff = Math.abs(curr.adjustedPrice - crosshairPrice);
          return currDiff < prevDiff ? curr : prev;
        });

        // Only show if within 1% of the closest marker's adjusted price
        const priceDiff =
          Math.abs(closest.adjustedPrice - crosshairPrice) /
          closest.adjustedPrice;
        if (priceDiff < 0.01) {
          nearbyMarker = closest;
        }
      }

      if (
        nearbyMarker &&
        params.offsetX !== undefined &&
        params.offsetY !== undefined
      ) {
        const rawIsBuy = nearbyMarker.trade.order_type.includes("Buy");
        const isBuy = isInverted ? !rawIsBuy : rawIsBuy;
        const color = isBuy ? "#4caf50" : "#f44336";
        tooltip.innerHTML = `
        <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">
          ${nearbyMarker.trade.order_type}
        </div>
        <div>Amount: ${Number(nearbyMarker.trade.total_filled_quote_amount).toFixed(2)} ${nearbyMarker.trade.quote_name}</div>
        <div>Price: ${nearbyMarker.price.toFixed(6)} ERG</div>
      `;
        tooltip.style.display = "block";

        // Calculate tooltip position with bounds checking
        const tooltipWidth = tooltip.offsetWidth || 150;
        const tooltipHeight = tooltip.offsetHeight || 60;
        const containerRect = chartContainer.getBoundingClientRect();
        const padding = 10;

        let left = params.offsetX + 15;
        let top = params.offsetY - 10;

        // Check right edge overflow
        if (left + tooltipWidth > containerRect.width - padding) {
          left = params.offsetX - tooltipWidth - 15;
        }

        // Check bottom edge overflow
        if (top + tooltipHeight > containerRect.height - padding) {
          top = containerRect.height - tooltipHeight - padding;
        }

        // Check top edge overflow
        if (top < padding) {
          top = padding;
        }

        // Check left edge overflow
        if (left < padding) {
          left = padding;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      } else {
        tooltip.style.display = "none";
      }
  };
  crosshairMoved.subscribe(null, crosshairCallback);

  const loadMarkersInternal = async (from: number, to: number) => {
    if (isDestroyed || !isEnabled) return;

    // Clear existing markers first
    clearMarkers();

    // Fetch trades for visible range
    // Note: from/to are in seconds (TradingView format), chain_time is in milliseconds
    const trades = await fetchUserTrades(
      tokenId,
      addresses,
      from * 1000,
      to * 1000,
    );

    if (isDestroyed) return;

    // Create arrow shapes for each trade
    for (const trade of trades) {
      if (isDestroyed) break;

      const rawIsBuy = trade.order_type.includes("Buy");
      // The chart datafeed returns prices in canonical quote/base direction.
      // When the symbol is {BASE}_{QUOTE} (e.g. "ERG_USE") the chart inverts
      // the OHLC data. Invert marker prices and flip buy/sell to match the chart axis.
      const isBuy = isInverted ? !rawIsBuy : rawIsBuy;
      const rawPrice = trade.price;

      if (rawPrice === 0) continue;

      const price = isInverted ? 1 / rawPrice : rawPrice;

      try {
        // Offset arrows outside candles. Buys execute near candle high (at ask), so use
        // larger offset to push arrow below the candle low. Sells execute near candle low
        // (at bid), so a smaller offset above the candle is sufficient.
        const buyOffset = price * 0.05;  // 5% down from execution price
        const sellOffset = price * 0.02; // 2% up from execution price
        const adjustedPrice = isBuy ? price - buyOffset : price + sellOffset;
        const time = Math.floor(trade.chain_time / 1000);

        const shapeId = chart.createShape(
          {
            time: time,
            price: adjustedPrice,
          },
          {
            shape: isBuy ? "arrow_up" : "arrow_down",
            lock: true,
            disableSave: true,
            disableUndo: true,
            overrides: {
              color: isBuy ? "#4caf50" : "#f44336",
              showLabel: false,
            },
          },
        );

        if (shapeId) {
          markers.push({ shapeId, trade, price, adjustedPrice, time });
        }
      } catch (error) {
        console.error("Error creating trade marker:", error);
      }
    }
  };

  const clearMarkers = () => {
    markers.forEach(({ shapeId }) => {
      try {
        chart.removeEntity(shapeId);
      } catch {
        // Marker may already be removed
      }
    });
    markers.length = 0;
    tooltip.style.display = "none";
  };

  const setEnabled = (enabled: boolean) => {
    isEnabled = enabled;
    if (!enabled) {
      clearMarkers();
    } else {
      const range = chart.getVisibleRange();
      loadMarkersInternal(range.from, range.to);
    }
  };

  const destroy = () => {
    isDestroyed = true;
    clearMarkers();
    crosshairMoved.unsubscribe(null, crosshairCallback);
    tooltip.remove();
  };

  return {
    loadMarkers: loadMarkersInternal,
    clearMarkers,
    setEnabled,
    destroy,
  };
}
