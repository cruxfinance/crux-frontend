import ErrorBoundary from "@components/ErrorBoundary";
import React, { FC, useMemo, useState } from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import DevMintPanel from "@components/cl/DevMintPanel";
import DevConfigPanel from "@components/cl/DevConfigPanel";

/**
 * Hidden developer page (not linked anywhere) with the CL test-token mint
 * and protocol-config panels. Positions, pairs and creating a position live
 * on the Liquidity page; limit orders go through the normal trade page.
 */
const ClDevPage: FC = () => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  const { sessionStatus, dAppWallet } = useWallet();
  const isAuthenticated = sessionStatus === "authenticated";

  const walletQuery = trpc.user.getWallets.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const userAddresses = useMemo(() => {
    if (dAppWallet.connected && dAppWallet.addresses.length > 0) {
      return dAppWallet.addresses;
    }
    if (!walletQuery.data) return [];
    const extractAddresses = (
      wallets: typeof walletQuery.data.walletList | undefined,
    ) =>
      wallets?.flatMap((w) => [
        w.changeAddress,
        ...(w.usedAddresses || []),
        ...(w.unusedAddresses || []),
      ]) || [];
    const addresses = [
      ...extractAddresses(walletQuery.data.walletList),
      ...extractAddresses(walletQuery.data.addedWalletList),
    ];
    return [...new Set(addresses)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dAppWallet, walletQuery.data]);

  const [, setMinted] = useState(0);

  return (
    <Box sx={{ p: upMd ? 3 : 1.5, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        CL developer tools
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Test-token minting and protocol config for the concentrated-liquidity
        contracts.
      </Typography>
      <DevMintPanel userAddresses={userAddresses} onMinted={() => setMinted((n) => n + 1)} />
      <Box sx={{ mt: 2 }}>
        <DevConfigPanel userAddresses={userAddresses} />
      </Box>
    </Box>
  );
};

export default function ClDevPageWithBoundary() {
  return (
    <ErrorBoundary>
      <ClDevPage />
    </ErrorBoundary>
  );
}
