import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  axisTicks,
  dragHandle,
  priceToX,
  xToPrice,
} from "./clLiquidity";
import type { LiquidityBucket, PriceRange } from "./clLiquidity";

interface RangeChartProps {
  buckets: LiquidityBucket[];
  /** Price domain of the chart (display orientation). */
  domain: PriceRange;
  currentPrice: number | null;
  selection: PriceRange | null;
  onSelectionChange: (range: PriceRange) => void;
  /** Called on pointer down / up so the caller can freeze the domain while dragging. */
  onDragStateChange?: (dragging: boolean) => void;
  formatPrice: (price: number) => string;
  height?: number;
}

const PAD_X = 12;
const AXIS_H = 20;
const HANDLE_W = 12;

/**
 * Liquidity histogram with a current-price marker and a selection overlay
 * whose min/max handles can be dragged (pointer events, plain SVG). The
 * price axis is logarithmic.
 */
const RangeChart: FC<RangeChartProps> = ({
  buckets,
  domain,
  currentPrice,
  selection,
  onSelectionChange,
  onDragStateChange,
  formatPrice,
  height = 150,
}) => {
  const theme = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - PAD_X * 2;
  const plotH = height - AXIS_H;
  const maxLiq = useMemo(
    () => buckets.reduce((m, b) => Math.max(m, b.liquidity), 0),
    [buckets],
  );

  const toX = useCallback(
    (p: number) => PAD_X + priceToX(p, domain.min, domain.max, innerW),
    [domain.min, domain.max, innerW],
  );

  const clientToPrice = (clientX: number): number | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left - PAD_X, 0), innerW);
    return xToPrice(x, domain.min, domain.max, innerW);
  };

  const startDrag = (which: "min" | "max") => (e: React.PointerEvent) => {
    if (!selection) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(which);
    onDragStateChange?.(true);
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging || !selection) return;
    const price = clientToPrice(e.clientX);
    if (price === null) return;
    onSelectionChange(dragHandle(dragging, price, selection, domain.min, domain.max));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    setDragging(null);
    onDragStateChange?.(false);
  };

  const onKey = (which: "min" | "max") => (e: React.KeyboardEvent) => {
    if (!selection) return;
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    const cur = which === "min" ? selection.min : selection.max;
    onSelectionChange(
      dragHandle(which, cur * (1 + dir * 0.005), selection, domain.min, domain.max),
    );
  };

  const ticks = useMemo(() => axisTicks(domain.min, domain.max, width < 360 ? 3 : 5), [domain, width]);
  const barColor = theme.palette.primary.main;
  const mutedBar = theme.palette.text.disabled;
  const inSel = (b: LiquidityBucket) =>
    !!selection && Math.sqrt(b.start * b.end) >= selection.min && Math.sqrt(b.start * b.end) < selection.max;

  const selX1 = selection ? Math.max(PAD_X, toX(selection.min)) : 0;
  const selX2 = selection ? Math.min(PAD_X + innerW, toX(selection.max)) : 0;

  const handle = (which: "min" | "max") => {
    if (!selection) return null;
    const price = which === "min" ? selection.min : selection.max;
    const x = toX(price);
    return (
      <g
        key={which}
        style={{ cursor: "ew-resize", touchAction: "none" }}
        onPointerDown={startDrag(which)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKey(which)}
        tabIndex={0}
        role="slider"
        aria-label={which === "min" ? "Minimum price" : "Maximum price"}
        aria-valuenow={price}
        aria-valuemin={domain.min}
        aria-valuemax={domain.max}
      >
        {/* generous invisible hit area for touch */}
        <rect x={x - 14} y={0} width={28} height={plotH} fill="transparent" />
        <line x1={x} x2={x} y1={0} y2={plotH} stroke={barColor} strokeWidth={2} />
        <rect
          x={x - HANDLE_W / 2}
          y={plotH / 2 - 14}
          width={HANDLE_W}
          height={28}
          rx={4}
          fill={barColor}
        />
        <line x1={x - 2} x2={x - 2} y1={plotH / 2 - 6} y2={plotH / 2 + 6} stroke={theme.palette.background.paper} strokeWidth={1} />
        <line x1={x + 2} x2={x + 2} y1={plotH / 2 - 6} y2={plotH / 2 + 6} stroke={theme.palette.background.paper} strokeWidth={1} />
      </g>
    );
  };

  const currentX = currentPrice ? toX(currentPrice) : null;
  const currentVisible =
    currentX !== null && currentX >= PAD_X && currentX <= PAD_X + innerW;

  return (
    <Box ref={wrapRef} sx={{ width: "100%", userSelect: "none" }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Liquidity distribution and selected price range"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* baseline */}
        <line
          x1={PAD_X}
          x2={PAD_X + innerW}
          y1={plotH}
          y2={plotH}
          stroke={theme.palette.divider}
        />
        {/* histogram */}
        {buckets.map((b, i) => {
          if (b.liquidity <= 0 || maxLiq <= 0) return null;
          const x1 = toX(b.start);
          const x2 = toX(b.end);
          const h = Math.max(2, (b.liquidity / maxLiq) * (plotH - 14));
          return (
            <rect
              key={i}
              x={x1 + 0.5}
              y={plotH - h}
              width={Math.max(1, x2 - x1 - 1)}
              height={h}
              rx={1.5}
              fill={inSel(b) ? barColor : mutedBar}
              opacity={inSel(b) ? 0.75 : 0.35}
            />
          );
        })}
        {/* selection overlay */}
        {selection && selX2 > selX1 && (
          <rect
            x={selX1}
            y={0}
            width={selX2 - selX1}
            height={plotH}
            fill={barColor}
            opacity={0.12}
            pointerEvents="none"
          />
        )}
        {/* current price marker */}
        {currentVisible && currentX !== null && (
          <g pointerEvents="none">
            <line
              x1={currentX}
              x2={currentX}
              y1={0}
              y2={plotH}
              stroke={theme.palette.text.primary}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle cx={currentX} cy={plotH} r={3.5} fill={theme.palette.text.primary} />
          </g>
        )}
        {handle("min")}
        {handle("max")}
        {/* axis */}
        {ticks.map((t, i) => (
          <text
            key={i}
            x={toX(t)}
            y={height - 5}
            fontSize={10}
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
            fill={theme.palette.text.secondary}
          >
            {formatPrice(t)}
          </text>
        ))}
      </svg>
      {buckets.every((b) => b.liquidity <= 0) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.5 }}>
          No concentrated liquidity in this pair yet.
        </Typography>
      )}
    </Box>
  );
};

export default RangeChart;
