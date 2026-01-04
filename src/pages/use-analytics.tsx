import React from "react";
import type { NextPage } from "next";
import { Container, Typography, Box, Paper, useTheme } from "@mui/material";
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
          USE is an algorithmic stablecoin on the Ergo blockchain, maintained by
          the Dexy protocol. The protocol uses an algorithmic reserve bank to
          maintain price stability through dynamic minting and redemption
          mechanisms.
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
          USE is designed to maintain a stable value through its algorithmic
          reserve mechanism. The protocol adjusts the supply of USE tokens based
          on market demand, using ERG reserves held in the bank contract to back
          the stablecoin.
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          The Relative Reserve Ratio indicates the health of the protocol by
          comparing the ERG reserves to the circulating USE supply. A ratio
          above 100% indicates the protocol is fully collateralized, while
          ratios below may trigger protective mechanisms to restore balance.
        </Typography>
      </Paper>
    </Container>
  );
};

export default UseAnalytics;
