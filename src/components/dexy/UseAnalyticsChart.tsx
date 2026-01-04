import React, { FC, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { LinearGradient } from "@visx/gradient";
import { localPoint } from "@visx/event";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { bisector } from "d3-array";
import { trpc } from "@lib/trpc";

type TimeRange = "1W" | "1M" | "3M" | "1Y" | "ALL";

interface MetricOption {
  value: DexyMetric;
  label: string;
  formatValue: (v: number) => string;
}

const metricOptions: MetricOption[] = [
  {
    value: "relative_reserve_ratio",
    label: "Relative Reserve Ratio",
    formatValue: (v) => (v * 100).toFixed(2) + "%",
  },
  {
    value: "reserve_ratio",
    label: "Bank Reserve Ratio",
    formatValue: (v) => (v * 100).toFixed(2) + "%",
  },
  {
    value: "relative_rr_with_lp",
    label: "Relative R/R with 2% LP",
    formatValue: (v) => (v * 100).toFixed(2) + "%",
  },
  {
    value: "stablecoin_circulation",
    label: "USE in Circulation",
    formatValue: (v) =>
      "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
  {
    value: "stablecoin_in_lp",
    label: "USE in LP",
    formatValue: (v) =>
      "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
  {
    value: "stablecoin_on_hands",
    label: "USE on Hands",
    formatValue: (v) =>
      "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
  {
    value: "erg_in_bank",
    label: "ERG in Bank",
    formatValue: (v) =>
      "Σ" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
  {
    value: "erg_tvl",
    label: "ERG TVL",
    formatValue: (v) =>
      "Σ" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  },
];

const timeRangeConfig: Record<
  TimeRange,
  { fromOffset: number; resolution: DexyResolution }
> = {
  "1W": { fromOffset: 7 * 24 * 3600, resolution: "1h" },
  "1M": { fromOffset: 30 * 24 * 3600, resolution: "1h" },
  "3M": { fromOffset: 90 * 24 * 3600, resolution: "1d" },
  "1Y": { fromOffset: 365 * 24 * 3600, resolution: "1d" },
  ALL: { fromOffset: 10 * 365 * 24 * 3600, resolution: "1w" },
};

interface ChartDataPoint {
  date: Date;
  value: number;
}

const margin = { top: 20, right: 20, bottom: 40, left: 70 };

const bisectDate = bisector<ChartDataPoint, Date>((d) => d.date).left;

interface ChartContentProps {
  width: number;
  height: number;
  data: ChartDataPoint[];
  metric: MetricOption;
  upSm: boolean;
}

const ChartContent: FC<ChartContentProps> = ({
  width,
  height,
  data,
  metric,
  upSm,
}) => {
  const theme = useTheme();
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<ChartDataPoint>();

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const { xScale, yScale } = useMemo(() => {
    if (data.length === 0 || innerWidth <= 0 || innerHeight <= 0) {
      return {
        xScale: scaleTime({
          domain: [new Date(), new Date()],
          range: [0, innerWidth],
        }),
        yScale: scaleLinear({ domain: [0, 1], range: [innerHeight, 0] }),
      };
    }

    const values = data.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range < 0.0001 ? maxValue * 0.05 : range * 0.1;
    const yDomain: [number, number] = [
      Math.max(0, minValue - padding),
      maxValue + padding,
    ];

    const dates = data.map((d) => d.date);

    return {
      xScale: scaleTime({
        domain: [
          Math.min(...dates.map((d) => d.getTime())),
          Math.max(...dates.map((d) => d.getTime())),
        ],
        range: [0, innerWidth],
      }),
      yScale: scaleLinear({
        domain: yDomain,
        range: [innerHeight, 0],
        nice: false,
      }),
    };
  }, [data, innerWidth, innerHeight]);

  const handleTooltip = (
    event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
  ) => {
    if (data.length === 0) return;

    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];

    let d = d0;
    if (d1 && d0) {
      d =
        x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
          ? d1
          : d0;
    }

    if (d) {
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(d.date) + margin.left,
        tooltipTop: yScale(d.value) + margin.top,
      });
    }
  };

  if (width <= 0 || height <= 0) return null;

  return (
    <Box sx={{ position: "relative" }}>
      <svg width={width} height={height}>
        <LinearGradient
          id="area-gradient"
          from={theme.palette.primary.main}
          to={theme.palette.primary.main}
          fromOpacity={0.3}
          toOpacity={0.05}
        />
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            strokeDasharray="3,3"
            stroke={theme.palette.divider}
            numTicks={5}
          />
          <AreaClosed
            data={data}
            x={(d) => xScale(d.date) ?? 0}
            y={(d) => yScale(d.value) ?? 0}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#area-gradient)"
          />
          <LinePath
            data={data}
            x={(d) => xScale(d.date) ?? 0}
            y={(d) => yScale(d.value) ?? 0}
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={upSm ? 8 : 4}
            stroke={theme.palette.divider}
            tickStroke={theme.palette.divider}
            tickLabelProps={() => ({
              fill: theme.palette.text.secondary,
              fontSize: 11,
              textAnchor: "middle",
            })}
            tickFormat={(date) =>
              (date as Date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: theme.palette.text.secondary,
              fontSize: 11,
              textAnchor: "end",
              dx: -4,
              dy: 4,
            })}
            tickFormat={(value) => metric.formatValue(value as number)}
          />
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
          />
          {tooltipData && (
            <circle
              cx={xScale(tooltipData.date)}
              cy={yScale(tooltipData.value)}
              r={5}
              fill={theme.palette.primary.main}
              stroke={theme.palette.background.paper}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
            padding: "8px 12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {metric.formatValue(tooltipData.value)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary }}
          >
            {tooltipData.date.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </TooltipWithBounds>
      )}
    </Box>
  );
};

const UseAnalyticsChart: FC = () => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  const [selectedMetric, setSelectedMetric] = useState<DexyMetric>(
    "relative_reserve_ratio",
  );
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const currentMetric = metricOptions.find((m) => m.value === selectedMetric)!;

  const now = Math.floor(Date.now() / 1000);
  const config = timeRangeConfig[timeRange];

  const { data: historyData, isLoading } = trpc.dexy.getHistory.useQuery(
    {
      instanceName: "USE",
      metric: selectedMetric,
      from: now - config.fromOffset,
      to: now,
      resolution: config.resolution,
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!historyData) return [];
    return historyData.map((point) => ({
      date: new Date(point.timestamp * 1000),
      value: point.value,
    }));
  }, [historyData]);

  const chartHeight = upMd ? 400 : upSm ? 300 : 250;

  const handleMetricClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMetricSelect = (metric: DexyMetric) => {
    setSelectedMetric(metric);
    setAnchorEl(null);
  };

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newRange: TimeRange | null,
  ) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Button
            onClick={handleMetricClick}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              textTransform: "none",
              fontSize: { xs: "1rem", md: "1.25rem" },
              fontWeight: 600,
              color: theme.palette.text.primary,
              p: 0,
              "&:hover": {
                backgroundColor: "transparent",
                color: theme.palette.primary.main,
              },
            }}
          >
            {currentMetric.label}
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 220,
              },
            }}
          >
            {metricOptions.map((option) => (
              <MenuItem
                key={option.value}
                onClick={() => handleMetricSelect(option.value)}
                selected={option.value === selectedMetric}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              px: { xs: 1.5, sm: 2 },
              py: 0.5,
              fontSize: "0.875rem",
            },
          }}
        >
          {(["1W", "1M", "3M", "1Y", "ALL"] as TimeRange[]).map((range) => (
            <ToggleButton key={range} value={range}>
              {range}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ position: "relative", height: chartHeight }}>
        {isLoading ? (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <CircularProgress size={48} />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              Loading chart data...
            </Typography>
          </Box>
        ) : chartData.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: chartHeight,
            }}
          >
            <Typography color="text.secondary">
              No data available for this time range
            </Typography>
          </Box>
        ) : (
          <ParentSize>
            {({ width }) => (
              <ChartContent
                width={width}
                height={chartHeight}
                data={chartData}
                metric={currentMetric}
                upSm={upSm}
              />
            )}
          </ParentSize>
        )}
      </Box>
    </Paper>
  );
};

export default UseAnalyticsChart;
