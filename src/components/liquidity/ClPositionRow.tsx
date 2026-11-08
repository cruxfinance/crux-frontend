import React, { FC } from "react";
import { Avatar, Box, Button, Chip, CircularProgress, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { formatFullNumber } from "@lib/utils/general";
import { clPositionStatusLabel, estimateUsdFromErg, formatErgAmount, formatUsdAmount } from "@components/cl/clFormat";
import { feePpmToPercent, rawToHuman } from "@components/cl/clMath";
import type { ClPortfolioPosition } from "@components/cl/clTypes";
import ClRangeBar from "./ClRangeBar";
import type { ClTokenView } from "./ClWithdrawDialog";

interface ClPositionRowProps {
  position: ClPortfolioPosition;
  tokenX: ClTokenView;
  tokenY: ClTokenView;
  icons: Record<string, string>;
  busy: boolean;
  onCollect: () => void;
  onWithdraw: () => void;
}

const amount = (raw: number, decimals: number) =>
  formatFullNumber(rawToHuman(raw, decimals), decimals > 4 ? 4 : 2);

/** One concentrated-liquidity row of the "Your Positions" table. */
const ClPositionRow: FC<ClPositionRowProps> = ({
  position: p,
  tokenX,
  tokenY,
  icons,
  busy,
  onCollect,
  onWithdraw,
}) => {
  const scale = Math.pow(10, tokenX.decimals - tokenY.decimals);
  const lower = p.price_lower * scale;
  const upper = p.price_upper * scale;
  const current = p.price_current * scale;
  const hasFees = p.fee_x > 0 || p.fee_y > 0;
  const feesUsd = estimateUsdFromErg(p.uncollected_fees_erg, p.value_erg, p.value_usd);

  const rangeBar = (
    <ClRangeBar lower={lower} upper={upper} current={current} inRange={p.in_range} />
  );

  return (
    <TableRow hover sx={p.in_range ? undefined : { "& > td": { opacity: 0.85 } }}>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <Avatar src={icons[tokenY.id]} sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
              {tokenY.name?.[0]}
            </Avatar>
            <Avatar src={icons[tokenX.id]} sx={{ width: 24, height: 24, ml: -0.5, fontSize: "0.75rem" }}>
              {tokenX.name?.[0]}
            </Avatar>
          </Box>
          <Typography variant="body2" component="span" fontWeight={500} sx={{ mb: 0 }}>
            {tokenY.name} / {tokenX.name}
          </Typography>
          <Chip label="CL" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
          <Tooltip
            title={
              p.withdraw_only
                ? "Retired contract version: this position can no longer trade or collect fees and must be withdrawn."
                : ""
            }
          >
            <Chip
              label={clPositionStatusLabel(p)}
              size="small"
              color={p.withdraw_only ? "default" : p.in_range ? "success" : "warning"}
              variant={p.withdraw_only || !p.in_range ? "outlined" : "filled"}
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0, display: "block", mt: 0.25 }}>
          {feePpmToPercent(p.fee_ppm)}% fee tier
        </Typography>
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 0.75 }}>{rangeBar}</Box>
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{rangeBar}</TableCell>
      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
        {p.value_usd !== null && p.value_usd !== undefined ? (
          <>
            ${formatFullNumber(p.value_usd, 2)}
            {p.value_erg !== null && p.value_erg !== undefined && (
              <Typography variant="caption" color="text.secondary" component="div">
                {formatErgAmount(p.value_erg)}
              </Typography>
            )}
          </>
        ) : (
          formatErgAmount(p.value_erg ?? rawToHuman(p.erg_value, 9))
        )}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
        {amount(p.x, tokenX.decimals)}{" "}
        <Typography variant="caption" color="text.secondary" component="span">
          {tokenX.name}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
        {amount(p.y, tokenY.decimals)}{" "}
        <Typography variant="caption" color="text.secondary" component="span">
          {tokenY.name}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "table-cell" } }}>
        {hasFees ? (
          <Tooltip
            arrow
            title={`${amount(p.fee_x, tokenX.decimals)} ${tokenX.name} + ${amount(p.fee_y, tokenY.decimals)} ${tokenY.name}`}
          >
            <span>
              {p.uncollected_fees_erg !== null && p.uncollected_fees_erg !== undefined
                ? feesUsd !== null
                  ? formatUsdAmount(feesUsd, 2)
                  : formatErgAmount(p.uncollected_fees_erg, 4)
                : "yes"}
            </span>
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.secondary" component="span" sx={{ mb: 0 }}>
            &mdash;
          </Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", flexWrap: "wrap" }}>
          {!p.withdraw_only && (
            <Tooltip title={hasFees ? "Collect uncollected fees, keep the position" : "No fees to collect yet"}>
              <span>
                <Button size="small" variant="outlined" disabled={!hasFees || busy} onClick={onCollect}>
                  {busy ? <CircularProgress size={14} /> : "Collect"}
                </Button>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Close the position and return everything to your wallet">
            <span>
              <Button size="small" variant="outlined" color="error" disabled={busy} onClick={onWithdraw}>
                Withdraw
              </Button>
            </span>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default ClPositionRow;
