import React from "react";
import type { NextPage } from "next";
import { Container, Typography, Box, Paper, useTheme } from "@mui/material";
import { trpc } from "@lib/trpc";
import UseStatsCards from "@components/dexy/UseStatsCards";
import UseAnalyticsChart from "@components/dexy/UseAnalyticsChart";
import UseResources from "@components/dexy/UseResources";

const DexyAnalytics: NextPage = () => {
  const theme = useTheme();

  const { data: analytics, isLoading } = trpc.dexy.getAnalytics.useQuery(
    { instanceName: "USE" },
    {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Intro text box */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          mb: 4,
          backgroundColor: "transparent",
        }}
      >
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          USE is a 3rd generation, scalable algorithmic stablecoin based on an
          algorithmic central bank design. The algorithmic central bank is
          deployed on the Ergo blockchain.
        </Typography>
      </Paper>

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

      <Box sx={{ mb: 4 }}>
        <UseResources />
      </Box>

      {/* Bottom text box */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          backgroundColor: "transparent",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          About USE
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary, mb: 2 }}
        >
          The Relative Reserve Ratio (R/R) shows how the bank performs against
          other traders in a live market. The Relative R/R above 100% and rising
          signals a healthy & solvent protocol in real trading conditions.
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          USE in core LP indicates only USE locked in the main liquidity pool
          that is controlled by the algorithmic bank. No community Liquidity
          Pools or cross-chain Liquidity is included.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DexyAnalytics;
