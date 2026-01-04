import React, { FC } from "react";
import { Paper, Typography, useTheme, Skeleton } from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";

interface UseStatsCardsProps {
  analytics: DexyAnalytics | null | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

const StatCard: FC<StatCardProps> = ({ label, value, subtitle }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: theme.palette.text.secondary, mb: 1 }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

const UseStatsCards: FC<UseStatsCardsProps> = ({ analytics, isLoading }) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, i) => (
          <Grid xs={6} sm={4} md={2} key={i}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="80%" height={32} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!analytics) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          Analytics data not available
        </Typography>
      </Paper>
    );
  }

  const formatFullNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatRatio = (ratio: number) => {
    return (ratio * 100).toFixed(3) + "%";
  };

  const stats = [
    {
      label: "USE in Circulation",
      value: "$" + formatFullNumber(analytics.stablecoinInCirculation),
    },
    {
      label: "USE in Core LP",
      value: "$" + formatFullNumber(analytics.stablecoinInCoreLp),
    },
    {
      label: "USE on Hands",
      value: "$" + formatFullNumber(analytics.stablecoinOnHands),
    },
    {
      label: "ERG in Bank",
      value: "Σ" + formatFullNumber(analytics.ergInBank),
    },
    {
      label: "ERG TVL",
      value: "Σ" + formatFullNumber(analytics.ergTvl),
    },
    {
      label: "Relative Reserve Ratio",
      value: formatRatio(analytics.relativeReserveRatio),
    },
  ];

  return (
    <Grid container spacing={2}>
      {stats.map((stat, i) => (
        <Grid xs={6} sm={4} md={2} key={i}>
          <StatCard label={stat.label} value={stat.value} />
        </Grid>
      ))}
    </Grid>
  );
};

export default UseStatsCards;
