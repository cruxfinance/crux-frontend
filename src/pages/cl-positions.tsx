import { useRouter } from "next/router";
import ErrorBoundary from "@components/ErrorBoundary";
import React, { FC, useEffect, useMemo, useState } from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useWallet } from "@lib/contexts/WalletContext";
import { trpc } from "@lib/trpc";
import CreatePositionCard from "@components/cl/CreatePositionCard";
import LimitOrderCard from "@components/cl/LimitOrderCard";
import PositionsTable, { ClPair } from "@components/cl/PositionsTable";
import DevMintPanel from "@components/cl/DevMintPanel";
import DevConfigPanel from "@components/cl/DevConfigPanel";
import { parsePreselectedPair } from "@components/cl/clFormat";
import { formatProtocolFeeFormula, shortId } from "@components/cl/clMath";

/** Response shape of `GET /dex/cl/config` — see ci-api's `entities::cl::ClProtocolConfigDto`. */
interface ClProtocolConfigDto {
  config_nft_id: string;
  config_box_id: string;
  receiver_address: string;
  phi_raw: number;
  floor_bps_raw: number;
  phi: number;
  floor_bps: number;
  phi_cap: number;
  floor_cap: number;
}

async function fetchClProtocolConfig(): Promise<ClProtocolConfigDto | null> {
  try {
    const response = await fetch(`${process.env.CRUX_API}/dex/cl/config`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.error) return null;
    return data as ClProtocolConfigDto;
  } catch {
    return null;
  }
}

/**
 * Page for the CL (concentrated-liquidity) "range position" contract.
 * Accepts `?x=<tokenId>&y=<tokenId>` to preselect a pair. Raw units are
 * shown alongside human units throughout.
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

  const router = useRouter();
  const preselectedPair = useMemo(
    () => (router.isReady ? parsePreselectedPair(router.query) : null),
    [router.isReady, router.query],
  );

  const [pair, setPair] = useState<ClPair | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const bumpRefresh = () => setRefreshTrigger((n) => n + 1);

  const [protocolConfig, setProtocolConfig] = useState<ClProtocolConfigDto | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchClProtocolConfig().then((config) => {
      if (!cancelled) setProtocolConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ p: upMd ? 3 : 1.5, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Concentrated liquidity
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: protocolConfig ? 0.5 : 3 }}>
        Provide liquidity in a price range and earn the swap fees routed
        through it. Amounts are shown in human units with raw units alongside.
      </Typography>
      {protocolConfig && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Protocol fee: {formatProtocolFeeFormula(protocolConfig.phi, protocolConfig.floor_bps)},
          receiver {shortId(protocolConfig.receiver_address)}
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <CreatePositionCard
          userAddresses={userAddresses}
          walletConnected={dAppWallet.connected}
          onPairChange={setPair}
          onCreated={bumpRefresh}
          refreshTrigger={refreshTrigger}
          initialPair={preselectedPair}
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

      <Box sx={{ mb: 3 }}>
        <LimitOrderCard
          pair={pair}
          walletConnected={dAppWallet.connected}
          refreshTrigger={refreshTrigger}
          onCreated={bumpRefresh}
        />
      </Box>

      <DevMintPanel userAddresses={userAddresses} onMinted={bumpRefresh} />
      <Box sx={{ mt: 2 }}>
        <DevConfigPanel userAddresses={userAddresses} />
      </Box>
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
