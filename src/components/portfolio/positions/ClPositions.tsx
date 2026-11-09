import React, { FC, useMemo } from "react";
import { Avatar, Box, Chip, Typography } from "@mui/material";
import { Currencies } from "@lib/utils/currencies";
import { trpc } from "@lib/trpc";
import { checkLocalIcon } from "@lib/utils/icons";
import { formatFullNumber } from "@lib/utils/general";
import CruxTableScroll from "@components/CruxTableScroll";
import CurrencyButton from "@components/CurrencyButton";
import Link from "@components/Link";
import {
  estimateUsdFromErg,
  clPositionStatusLabel,
  formatPortfolioValue,
  sortPositionsInRangeFirst,
} from "@components/cl/clFormat";
import { ERG_DECIMALS, ERG_TOKEN_ID, feePpmToPercent, rawPriceToHuman, shortId } from "@components/cl/clMath";
import type { ClTokenMeta } from "@components/cl/clTypes";
import { useClStatus } from "@components/cl/useClStatus";
import { useClKeyBoxRefresh } from "@components/cl/useClKeyBoxRefresh";
import ClStatusBanner from "@components/liquidity/ClStatusBanner";
import ClKeyBoxWarning from "@components/liquidity/ClKeyBoxWarning";

type ClPositionsProps = {
  currency: Currencies;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
  addressList: string[];
};

const ERG_META: ClTokenMeta = { name: "ERG", decimals: ERG_DECIMALS };

const headers = [
  ["Pair"],
  ["Range"],
  ["Status"],
  ["Value"],
  ["Uncollected Fees"],
  ["Manage"],
];

/**
 * Portfolio block for concentrated-liquidity positions, fed by ci-api's
 * `/dex/cl/portfolio` through tRPC. Renders nothing when the wallet has no
 * CL positions, and a short notice (not a crash) when the endpoint fails.
 */
const ClPositions: FC<ClPositionsProps> = ({ currency, addressList, setCurrency }) => {
  const clPortfolio = trpc.portfolio.getClPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
      enabled: addressList.length > 0,
    },
  );

  const clStatus = useClStatus();
  const storagePeriodBlocks = clStatus?.storagePeriodBlocks;
  const keyRefresh = useClKeyBoxRefresh(() => {
    clPortfolio.refetch();
  });

  const tableData = useMemo(() => {
    const data = clPortfolio.data;
    if (!data) return [];
    const tokens = data.tokens || {};
    const meta = (id: string): ClTokenMeta =>
      id === ERG_TOKEN_ID ? ERG_META : tokens[id] || { name: shortId(id, 4), decimals: 0 };

    const tokenLabel = (id: string, name: string) => (
      <Box sx={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        <Avatar
          src={checkLocalIcon(id) ?? undefined}
          sx={{ width: 24, height: 24, mr: 1, fontSize: "0.75rem" }}
        >
          {name?.[0]}
        </Avatar>
        <Typography sx={{ textOverflow: "ellipsis" }}>{name}</Typography>
      </Box>
    );

    return sortPositionsInRangeFirst(
      data.positions.map((p) => ({ ...p, erg_value: p.value_erg ?? p.erg_value })),
    ).map((p) => {
      const x = meta(p.token_x);
      const y = meta(p.token_y);
      const lower = rawPriceToHuman(p.price_lower, x.decimals, y.decimals);
      const upper = rawPriceToHuman(p.price_upper, x.decimals, y.decimals);
      const feesUsd = estimateUsdFromErg(p.uncollected_fees_erg, p.value_erg, p.value_usd);
      return {
        Pair: (
          <Box>
            {tokenLabel(p.token_y, `${y.name} / ${x.name}`)}
            <Typography variant="caption" color="text.secondary">
              {feePpmToPercent(p.fee_ppm)}% fee
            </Typography>
          </Box>
        ),
        Range: (
          <Box sx={{ whiteSpace: "nowrap" }}>
            <Typography>
              {formatFullNumber(lower, 6)} &ndash; {formatFullNumber(upper, 6)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {y.name} per {x.name}
            </Typography>
          </Box>
        ),
        Status: (
          <Chip
            label={clPositionStatusLabel(p)}
            size="small"
            color={p.withdraw_only ? "default" : p.in_range ? "success" : "warning"}
            variant={p.withdraw_only || !p.in_range ? "outlined" : "filled"}
            sx={{ height: 20, fontSize: "0.65rem" }}
          />
        ),
        Value: formatPortfolioValue(currency, p.value_erg, p.value_usd),
        "Uncollected Fees": formatPortfolioValue(currency, p.uncollected_fees_erg, feesUsd),
        Manage: (
          <Box sx={{ minWidth: 160 }}>
            <Link href="/liquidity" sx={{ whiteSpace: "nowrap" }}>
              Manage
            </Link>
            <ClKeyBoxWarning
              ageBlocks={p.key_box_age_blocks}
              storagePeriodBlocks={storagePeriodBlocks}
              busy={keyRefresh.busyId === p.position_id}
              onRefresh={() => keyRefresh.refresh(p.position_id)}
            />
          </Box>
        ),
      };
    });
  }, [clPortfolio.data, currency, storagePeriodBlocks, keyRefresh]);

  if (addressList.length === 0) return null;
  if (clPortfolio.isError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Concentrated liquidity positions are unavailable right now.
        </Typography>
      </Box>
    );
  }
  if (!clPortfolio.isLoading && tableData.length === 0) return null;

  const total = clPortfolio.data
    ? formatPortfolioValue(
        currency,
        clPortfolio.data.total_value_erg,
        clPortfolio.data.total_value_usd,
      )
    : null;

  const tableActions = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      {total && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
          Total {total}
        </Typography>
      )}
      <CurrencyButton currency={currency} setCurrency={setCurrency} />
    </Box>
  );


  return (
    <Box>
      <ClStatusBanner />
      <CruxTableScroll
        title="Concentrated Liquidity Positions"
        actions={tableActions}
        headers={headers}
        data={tableData}
        loading={clPortfolio.isLoading}
      />
    </Box>
  );
};

export default ClPositions;
