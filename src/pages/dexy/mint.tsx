import React from "react";
import type { NextPage } from "next";
import { Container, Typography, Box, Paper, useTheme } from "@mui/material";
import MintWidget from "@components/dexy/MintWidget";

const DexyMint: NextPage = () => {
  const theme = useTheme();

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
          Mint dexy stablecoins directly from the algorithmic bank, or swap via
          the liquidity pool. The widget automatically finds the best rate for
          you.
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
          Mint Stablecoins
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          Choose between ArbMint, FreeMint, or LP Swap for the best exchange
          rate
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 4,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 480 }}>
          <MintWidget />
        </Box>
      </Box>

      {/* Info box */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          backgroundColor: "transparent",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          How Minting Works
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary, mb: 2 }}
        >
          <strong>ArbMint:</strong> Available when the LP rate exceeds the
          oracle rate by a margin. This creates an arbitrage opportunity where
          you can mint at the oracle rate and potentially sell higher.
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary, mb: 2 }}
        >
          <strong>FreeMint:</strong> Available during specific periods when rate
          conditions are favorable. Has a per-period allowance limit.
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          <strong>LP Swap:</strong> Always available through the Spectrum DEX
          liquidity pool. Rate depends on current pool reserves.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DexyMint;
