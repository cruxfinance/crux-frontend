import React, { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { formatPriceCompact, rangeBarLayout } from "@components/cl/clLiquidity";

interface ClRangeBarProps {
  /** Human prices, same orientation. */
  lower: number;
  upper: number;
  current: number;
  inRange: boolean;
  width?: number | string;
}

/** Compact min-max bar with a current-price marker; green in range, amber out. */
const ClRangeBar: FC<ClRangeBarProps> = ({ lower, upper, current, inRange, width = 150 }) => {
  const theme = useTheme();
  const valid = lower > 0 && upper > lower && current > 0;
  const color = inRange ? theme.palette.success.main : theme.palette.warning.main;
  const layout = valid ? rangeBarLayout(lower, upper, current) : null;
  return (
    <Box sx={{ width, minWidth: 110 }}>
      <Box sx={{ position: "relative", height: 14 }} aria-hidden>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 6,
            height: 2,
            borderRadius: 1,
            bgcolor: "divider",
          }}
        />
        {layout && (
          <>
            <Box
              sx={{
                position: "absolute",
                top: 3,
                height: 8,
                borderRadius: 4,
                bgcolor: color,
                opacity: inRange ? 0.85 : 0.6,
                left: `${Math.max(0, layout.startPct)}%`,
                width: `${Math.max(2, Math.min(100, layout.endPct) - Math.max(0, layout.startPct))}%`,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                width: 2,
                height: 14,
                borderRadius: 1,
                bgcolor: "text.primary",
                left: `calc(${Math.min(100, Math.max(0, layout.markerPct))}% - 1px)`,
              }}
            />
          </>
        )}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 0, display: "block", whiteSpace: "nowrap", fontSize: "0.68rem", lineHeight: 1.4 }}
      >
        {formatPriceCompact(lower)} &ndash; {formatPriceCompact(upper)}
      </Typography>
    </Box>
  );
};

export default ClRangeBar;
