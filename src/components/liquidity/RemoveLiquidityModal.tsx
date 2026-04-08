import React, { FC, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Avatar,
  CircularProgress,
  IconButton,
  Slider,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useAlert } from "@contexts/AlertContext";
import { formatNumber } from "@lib/utils/general";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface LpPosition {
  pool_id: string;
  pool_type: string;
  lp_token_id: string;
  lp_token_name: string;
  lp_token_amount: number;
  share_of_pool: number;
  base_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  quote_token: {
    token_id: string;
    name: string;
    decimals: number;
    amount: number;
    value_usd: number;
  };
  total_value_usd: number;
  pool_tvl_usd: number;
}

interface RemoveLiquidityModalProps {
  open: boolean;
  position: LpPosition;
  userAddresses: string[];
  icons: Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

const PERCENTAGE_OPTIONS = [25, 50, 75, 100];

const RemoveLiquidityModal: FC<RemoveLiquidityModalProps> = ({
  open,
  position,
  userAddresses,
  icons,
  onClose,
  onSuccess,
}) => {
  const { addAlert } = useAlert();
  const theme = useTheme();
  const [percentage, setPercentage] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const isDexy = position.pool_type?.toLowerCase().includes("dexy");
  const dexyFeePct = 2; // 2% redemption fee hardcoded in Dexy redeem contract

  const lpAmountToRemove = Math.floor(
    (position.lp_token_amount * percentage) / 100,
  );

  const feeMultiplier = isDexy ? (100 - dexyFeePct) / 100 : 1;

  const estimatedBase = useMemo(
    () => (position.base_token.amount * percentage * feeMultiplier) / 100,
    [position.base_token.amount, percentage, feeMultiplier],
  );

  const estimatedQuote = useMemo(
    () => (position.quote_token.amount * percentage * feeMultiplier) / 100,
    [position.quote_token.amount, percentage, feeMultiplier],
  );

  const handleSubmit = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    if (lpAmountToRemove <= 0) {
      addAlert("error", "Please select an amount to remove");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.CRUX_API}/dex/remove_liquidity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pool_id: position.pool_id,
            user_addresses: userAddresses,
            lp_token_amount: lpAmountToRemove,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to build transaction: ${errorText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await context.submit_tx(signedTx);

      addAlert("success", `Liquidity removed! TX: ${txId.slice(0, 8)}...`);
      onSuccess();
    } catch (error: any) {
      console.error("Remove liquidity error:", error);
      addAlert("error", error.message || "Failed to remove liquidity");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTokenAmount = (amount: number, decimals: number) =>
    formatNumber(amount / Math.pow(10, decimals), decimals > 4 ? 4 : 2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "1px solid rgba(200, 225, 255, 0.08)",
          backgroundImage: "none",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0 }}>
          Remove Liquidity
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": { color: "text.primary", bgcolor: "rgba(255,255,255,0.05)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 0 }}>
        {/* Pool pair header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 3,
            p: 2,
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ position: "relative", width: 52, height: 32, flexShrink: 0 }}>
            <Avatar
              src={icons[position.quote_token.token_id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 0, zIndex: 2, border: "2px solid", borderColor: "background.paper" }}
            >
              {position.quote_token.name?.[0]}
            </Avatar>
            <Avatar
              src={icons[position.base_token.token_id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 20, zIndex: 1, border: "2px solid", borderColor: "background.paper" }}
            >
              {position.base_token.name?.[0]}
            </Avatar>
          </Box>
          <Box sx={{ ml: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0, lineHeight: 1.3 }}>
              {position.quote_token.name} / {position.base_token.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              Pool share: {(position.share_of_pool * 100).toFixed(4)}%
            </Typography>
          </Box>
          {position.total_value_usd > 0 && (
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ ml: "auto", mb: 0 }}
            >
              ${formatNumber(position.total_value_usd, 2)}
            </Typography>
          )}
        </Box>

        {/* Your position breakdown */}
        <Box
          sx={{
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "divider",
            p: 2,
            mb: 3,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
            Your Position
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={icons[position.base_token.token_id]}
                sx={{ width: 22, height: 22, fontSize: "0.65rem" }}
              >
                {position.base_token.name?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ mb: 0 }}>
                {position.base_token.name}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0 }}>
              {formatTokenAmount(position.base_token.amount, position.base_token.decimals)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={icons[position.quote_token.token_id]}
                sx={{ width: 22, height: 22, fontSize: "0.65rem" }}
              >
                {position.quote_token.name?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ mb: 0 }}>
                {position.quote_token.name}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0 }}>
              {formatTokenAmount(position.quote_token.amount, position.quote_token.decimals)}
            </Typography>
          </Box>
        </Box>

        {/* Percentage selector */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
          Amount to remove
        </Typography>

        {/* Large percentage display */}
        <Typography
          variant="h3"
          fontWeight={700}
          sx={{ textAlign: "center", mb: 2 }}
        >
          {percentage}%
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          {PERCENTAGE_OPTIONS.map((pct) => (
            <Chip
              key={pct}
              label={`${pct}%`}
              onClick={() => setPercentage(pct)}
              color={percentage === pct ? "primary" : "default"}
              variant={percentage === pct ? "filled" : "outlined"}
              sx={{
                flex: 1,
                fontWeight: 600,
                borderRadius: "8px",
                height: 36,
                ...(percentage !== pct && {
                  borderColor: "divider",
                  "&:hover": { borderColor: "rgba(200,225,255,0.3)" },
                }),
              }}
            />
          ))}
        </Box>
        <Box sx={{ px: 1 }}>
          <Slider
            value={percentage}
            onChange={(_, v) => setPercentage(v as number)}
            min={1}
            max={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
          />
        </Box>

        {/* Estimated output */}
        <Box
          sx={{
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
            p: 2,
            mt: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
            You will receive
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={icons[position.base_token.token_id]}
                sx={{ width: 24, height: 24, fontSize: "0.65rem" }}
              >
                {position.base_token.name?.[0]}
              </Avatar>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                {position.base_token.name}
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
              {formatTokenAmount(estimatedBase, position.base_token.decimals)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={icons[position.quote_token.token_id]}
                sx={{ width: 24, height: 24, fontSize: "0.65rem" }}
              >
                {position.quote_token.name?.[0]}
              </Avatar>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                {position.quote_token.name}
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
              {formatTokenAmount(estimatedQuote, position.quote_token.decimals)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      {/* Dexy fee + warning */}
      {isDexy && (
        <Box sx={{ px: 3, pt: 1 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              p: 2,
              borderRadius: "10px",
              bgcolor: `${theme.palette.warning.main}12`,
              border: `1px solid ${theme.palette.warning.main}44`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
              <Typography variant="body2" fontWeight={700} sx={{ color: theme.palette.warning.main }}>
                Dexy LP - {dexyFeePct}% Redemption Fee
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
              The amounts above reflect the {dexyFeePct}% fee deducted by the on-chain contract.
              Redemption may also be blocked if the pool price deviates more than 2% from the oracle price.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Full-width action button */}
      <Box sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting || lpAmountToRemove <= 0}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            background: lpAmountToRemove > 0 && !submitting
              ? "linear-gradient(135deg, #E57373 0%, #EF5350 100%)"
              : undefined,
            border: lpAmountToRemove > 0 && !submitting
              ? "1px solid rgba(229, 115, 115, 0.4)"
              : undefined,
            "&:hover": {
              background: "linear-gradient(135deg, #EF9A9A 0%, #E57373 100%)",
            },
          }}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting ? "Removing Liquidity..." : `Remove ${percentage}%`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default RemoveLiquidityModal;
