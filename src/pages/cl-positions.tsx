import ErrorBoundary from "@components/ErrorBoundary";
import React, { FC, useMemo, useState } from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import CreatePositionCard from "@components/cl/CreatePositionCard";
import PositionsTable, { ClPair } from "@components/cl/PositionsTable";
import DevMintPanel from "@components/cl/DevMintPanel";

/**
 * Hidden POC page for the CL (concentrated-liquidity) "range position"
 * contract. Not linked from any nav — reachable only by URL. Debugging
 * tool: raw units are shown alongside human units throughout.
 *
 * See openspec/changes/cl-lp-poc/design.md for the API contract.
 */
const ClPositionsPage: FC = () => {
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

  const [pair, setPair] = useState<ClPair | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const bumpRefresh = () => setRefreshTrigger((n) => n + 1);

  return (
    <Box sx={{ p: upMd ? 3 : 1.5, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        CL Positions (POC)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Internal tool for testing concentrated-liquidity range positions on
        mainnet with self-minted test tokens. Not linked from navigation.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <CreatePositionCard
          userAddresses={userAddresses}
          walletConnected={dAppWallet.connected}
          onPairChange={setPair}
          onCreated={bumpRefresh}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <PositionsTable
          userAddresses={userAddresses}
          pair={pair}
          refreshTrigger={refreshTrigger}
          onChanged={bumpRefresh}
        />
      </Box>

      <DevMintPanel userAddresses={userAddresses} onMinted={bumpRefresh} />
    </Box>
  );
};

export default function ClPositionsPageWithBoundary() {
  return (
    <ErrorBoundary>
      <ClPositionsPage />
    </ErrorBoundary>
  );
}
