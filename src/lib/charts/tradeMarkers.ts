import { IChartWidgetApi, EntityId } from "./charting_library";

export interface DexOrder {
  id: number;
  transaction_id: string;
  quote_name: string;
  base_name: string;
  order_quote_amount: string;
  order_base_amount: string;
  filled_quote_amount: string;
  filled_base_amount: string;
  total_filled_quote_amount: string;
  total_filled_base_amount: string;
  exchange: number;
  order_type: string;
  status: string;
  maker_address: string;
  taker_address: string;
  chain_time: number;
}

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
): TradeMarkerManager {
  const markers: TradeMarkerData[] = [];
  let isDestroyed = false;

  // Create tooltip element
  const tooltip = createTooltipElement();
  chartContainer.style.position = "relative";
  chartContainer.appendChild(tooltip);

  const calculatePrice = (baseAmount: string, quoteAmount: string): number => {
    const quote = Number(quoteAmount);
    if (quote === 0) return 0;
    return Number(baseAmount) / quote;
  };

  // Track crosshair position and check proximity to markers
  const crosshairSubscription = chart
    .crossHairMoved()
    .subscribe(null, (params) => {
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
      if (nearbyTimeMarkers.length > 0) {
        const closest = nearbyTimeMarkers.reduce((prev, curr) => {
          const prevDiff = Math.abs(prev.adjustedPrice - params.price);
          const currDiff = Math.abs(curr.adjustedPrice - params.price);
          return currDiff < prevDiff ? curr : prev;
        });

        // Only show if within 1% of the closest marker's adjusted price
        const priceDiff =
          Math.abs(closest.adjustedPrice - params.price) /
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
        const isBuy = nearbyMarker.trade.order_type.includes("Buy");
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
    });

  const loadMarkersInternal = async (from: number, to: number) => {
    if (isDestroyed) return;

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

      const isBuy = trade.order_type.includes("Buy");
      const price = calculatePrice(
        trade.total_filled_base_amount,
        trade.total_filled_quote_amount,
      );

      if (price === 0) continue;

      try {
        // Offset the price to position arrows outside candles
        const priceOffset = price * 0.02;
        const adjustedPrice = isBuy ? price - priceOffset : price + priceOffset;
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
              fontsize: 28,
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

  const destroy = () => {
    isDestroyed = true;
    clearMarkers();
    crosshairSubscription.unsubscribe(null);
    tooltip.remove();
  };

  return {
    loadMarkers: loadMarkersInternal,
    clearMarkers,
    destroy,
  };
}
