import React from "react";
import type { NextPage } from "next";
import { Container, Typography, Box, useTheme } from "@mui/material";
import { trpc } from "@lib/trpc";
import UseStatsCards from "@components/dexy/UseStatsCards";
import UseAnalyticsChart from "@components/dexy/UseAnalyticsChart";
import UseResources from "@components/dexy/UseResources";

const UseAnalytics: NextPage = () => {
  const theme = useTheme();

  const { data: analytics, isLoading } = trpc.dexy.getAnalytics.useQuery(
    { instanceName: "USE" },
    {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
          }}
        >
          USE Analytics
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          Track the health and performance of the USE stablecoin protocol
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <UseStatsCards analytics={analytics} isLoading={isLoading} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <UseAnalyticsChart />
      </Box>

      <Box>
        <UseResources />
      </Box>
    </Container>
  );
};

export default UseAnalytics;
