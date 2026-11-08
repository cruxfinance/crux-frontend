import React, { FC } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatFullNumber } from "@lib/utils/general";
import { feePpmToPercent, rawToHuman } from "@components/cl/clMath";
import type { ClPortfolioPosition } from "@components/cl/clTypes";

export interface ClTokenView {
  id: string;
  name: string;
  decimals: number;
}

interface ClWithdrawDialogProps {
  open: boolean;
  position: ClPortfolioPosition;
  tokenX: ClTokenView;
  tokenY: ClTokenView;
  icons: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const fmt = (raw: number, decimals: number) =>
  formatFullNumber(rawToHuman(raw, decimals), decimals > 4 ? 4 : 2);

/** Confirmation for closing a CL position, in the style of RemoveLiquidityModal. */
const ClWithdrawDialog: FC<ClWithdrawDialogProps> = ({
  open,
  position,
  tokenX,
  tokenY,
  icons,
  busy,
  onClose,
  onConfirm,
}) => {
  const rows = [
    { t: tokenX, reserve: position.x, fee: position.fee_x },
    { t: tokenY, reserve: position.y, fee: position.fee_y },
  ];
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "1px solid rgba(200, 225, 255, 0.08)",
          backgroundImage: "none",
          m: { xs: 1, sm: 4 },
          width: { xs: "calc(100% - 16px)", sm: undefined },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0 }}>
          Withdraw Position
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          disabled={busy}
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "rgba(255,255,255,0.05)" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box sx={{ px: 3, pb: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 2,
            p: 2,
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ position: "relative", width: 52, height: 32, flexShrink: 0 }}>
            <Avatar
              src={icons[tokenY.id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 0, zIndex: 2, border: "2px solid", borderColor: "background.paper" }}
            >
              {tokenY.name?.[0]}
            </Avatar>
            <Avatar
              src={icons[tokenX.id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 20, zIndex: 1, border: "2px solid", borderColor: "background.paper" }}
            >
              {tokenX.name?.[0]}
            </Avatar>
          </Box>
          <Box sx={{ ml: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0, lineHeight: 1.3 }}>
              {tokenY.name} / {tokenX.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              Range position, {feePpmToPercent(position.fee_ppm)}% fee tier
            </Typography>
          </Box>
          {position.value_usd !== null && position.value_usd !== undefined && (
            <Typography variant="body2" fontWeight={600} sx={{ ml: "auto", mb: 0 }}>
              ${formatFullNumber(position.value_usd, 2)}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
            p: 2,
            mb: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
            You will receive
          </Typography>
          {rows.map(({ t, reserve, fee }, i) => (
            <Box key={t.id} sx={{ display: "flex", justifyContent: "space-between", mb: i === 0 ? 1.5 : 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar src={icons[t.id]} sx={{ width: 24, height: 24, fontSize: "0.65rem" }}>
                  {t.name?.[0]}
                </Avatar>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                  {t.name}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
                  {fmt(reserve + fee, t.decimals)}
                </Typography>
                {fee > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                    incl. {fmt(fee, t.decimals)} fees
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0 }}>
          This closes the position and returns its reserves plus uncollected fees to your wallet.
          The position key is burned, so it cannot be collected from or withdrawn again.
        </Typography>
      </Box>
      <Box sx={{ px: 3, pb: 3, pt: 2, display: "flex", gap: 1.5 }}>
        <Button fullWidth variant="outlined" onClick={onClose} disabled={busy} sx={{ py: 1.5, borderRadius: "12px", textTransform: "none", fontWeight: 600 }}>
          Keep position
        </Button>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onConfirm}
          disabled={busy}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            background: busy ? undefined : "linear-gradient(135deg, #E57373 0%, #EF5350 100%)",
            border: busy ? undefined : "1px solid rgba(229, 115, 115, 0.4)",
            "&:hover": { background: "linear-gradient(135deg, #EF9A9A 0%, #E57373 100%)" },
          }}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {busy ? "Withdrawing..." : "Withdraw"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ClWithdrawDialog;
