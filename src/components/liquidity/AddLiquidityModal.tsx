import React, { FC, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  Avatar,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useAlert } from "@contexts/AlertContext";
import { formatNumber, formatFullNumber } from "@lib/utils/general";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface PoolWithApr {
  pool_id: string;
  pool_type: string;
  base_token_id: string;
  base_token_name: string;
  base_token_decimals: number;
  quote_token_id: string;
  quote_token_name: string;
  quote_token_decimals: number;
  base_amount: number;
  quote_amount: number;
  tvl_erg: number;
  fee_pct: number;
  volume_24h: number;
  apr_7d: number | null;
  apr_30d: number | null;
}

interface AddLiquidityModalProps {
  open: boolean;
  pool: PoolWithApr;
  userAddresses: string[];
  ergPrice: number;
  icons: Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

const AddLiquidityModal: FC<AddLiquidityModalProps> = ({
  open,
  pool,
  userAddresses,
  ergPrice,
  icons,
  onClose,
  onSuccess,
}) => {
  const { addAlert } = useAlert();
  const theme = useTheme();
  const [baseInput, setBaseInput] = useState("");
  const [quoteInput, setQuoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastEdited, setLastEdited] = useState<"base" | "quote">("base");
  const [rateInverted, setRateInverted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isDexy = pool.pool_type?.toLowerCase().includes("dexy");

  // Pool ratio: how many quote tokens per base token
  const poolRatio =
    pool.base_amount > 0
      ? (pool.quote_amount / Math.pow(10, pool.quote_token_decimals)) /
        (pool.base_amount / Math.pow(10, pool.base_token_decimals))
      : 0;

  const handleBaseChange = (value: string) => {
    setBaseInput(value);
    setLastEdited("base");
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && poolRatio > 0) {
      setQuoteInput((num * poolRatio).toFixed(pool.quote_token_decimals));
    } else {
      setQuoteInput("");
    }
  };

  const handleQuoteChange = (value: string) => {
    setQuoteInput(value);
    setLastEdited("quote");
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && poolRatio > 0) {
      setBaseInput((num / poolRatio).toFixed(pool.base_token_decimals));
    } else {
      setBaseInput("");
    }
  };

  const handleButtonClick = () => {
    if (isDexy && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    handleSubmit();
  };

  const handleClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }

    const baseAmount = parseFloat(baseInput);
    const quoteAmount = parseFloat(quoteInput);
    if (isNaN(baseAmount) || baseAmount <= 0 || isNaN(quoteAmount) || quoteAmount <= 0) {
      addAlert("error", "Please enter valid amounts");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pool_id: pool.pool_id,
        user_addresses: userAddresses,
        base_amount: Math.round(baseAmount * Math.pow(10, pool.base_token_decimals)),
        quote_amount: Math.round(quoteAmount * Math.pow(10, pool.quote_token_decimals)),
      };
      console.log("Add liquidity payload:", {
        baseInput, quoteInput,
        baseAmount, quoteAmount,
        base_token: pool.base_token_name, base_decimals: pool.base_token_decimals,
        quote_token: pool.quote_token_name, quote_decimals: pool.quote_token_decimals,
        ...payload,
      });
      const response = await fetch(
        `${process.env.CRUX_API}/dex/add_liquidity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

      addAlert("success", `Liquidity added! TX: ${txId.slice(0, 8)}...`);
      onSuccess();
    } catch (error: any) {
      console.error("Add liquidity error:", error);
      addAlert("error", error.message || "Failed to add liquidity");
    } finally {
      setSubmitting(false);
    }
  };

  const baseNum = parseFloat(baseInput) || 0;
  const quoteNum = parseFloat(quoteInput) || 0;

  const stablecoinNames = ["sigusd", "use"];
  const isBaseStable = stablecoinNames.includes(pool.base_token_name?.toLowerCase() ?? "");
  const isQuoteStable = stablecoinNames.includes(pool.quote_token_name?.toLowerCase() ?? "");

  // LP token estimate: proportional to deposit relative to pool reserves
  const lpTokensEstimate =
    pool.base_amount > 0 && baseNum > 0
      ? (baseNum * Math.pow(10, pool.base_token_decimals)) / pool.base_amount
      : 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          Add Liquidity
        </Typography>
        <IconButton
          onClick={handleClose}
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
              src={icons[pool.quote_token_id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 0, zIndex: 2, border: "2px solid", borderColor: "background.paper" }}
            >
              {pool.quote_token_name?.[0]}
            </Avatar>
            <Avatar
              src={icons[pool.base_token_id]}
              sx={{ width: 32, height: 32, position: "absolute", left: 20, zIndex: 1, border: "2px solid", borderColor: "background.paper" }}
            >
              {pool.base_token_name?.[0]}
            </Avatar>
          </Box>
          <Box sx={{ ml: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0, lineHeight: 1.3 }}>
              {pool.quote_token_name} / {pool.base_token_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              Fee: {pool.fee_pct.toFixed(1)}%
            </Typography>
          </Box>
        </Box>

        {/* Base token input card */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          You deposit
        </Typography>
        <Box
          sx={{
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: lastEdited === "base" ? "rgba(144, 202, 249, 0.45)" : "divider",
            p: 2,
            mb: 2,
            transition: "border-color 0.2s",
            "&:hover": { borderColor: "rgba(200,225,255,0.2)" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(255,255,255,0.06)",
                borderRadius: "8px",
                px: 1.5,
                py: 0.75,
                flexShrink: 0,
              }}
            >
              <Avatar
                src={icons[pool.quote_token_id]}
                sx={{ width: 24, height: 24, fontSize: "0.7rem" }}
              >
                {pool.quote_token_name?.[0]}
              </Avatar>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
                {pool.quote_token_name}
              </Typography>
            </Box>
            <TextField
              fullWidth
              variant="standard"
              type="number"
              value={quoteInput}
              onChange={(e) => handleQuoteChange(e.target.value)}
              placeholder="0.00"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "1.5rem",
                  fontWeight: 500,
                  textAlign: "right",
                  "& input": { textAlign: "right", p: 0 },
                  "& input::placeholder": { opacity: 0.4 },
                },
              }}
            />
          </Box>
          {quoteNum > 0 && (pool.quote_token_name?.toLowerCase() === "erg" || isQuoteStable) && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0, textAlign: "right", mt: 0.5 }}>
              {"\u2248"} ${formatFullNumber(isQuoteStable ? quoteNum : quoteNum * ergPrice, 2)}
            </Typography>
          )}
        </Box>

        {/* Base token input card */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          And
        </Typography>
        <Box
          sx={{
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: lastEdited === "base" ? "rgba(144, 202, 249, 0.45)" : "divider",
            p: 2,
            mb: 2,
            transition: "border-color 0.2s",
            "&:hover": { borderColor: "rgba(200,225,255,0.2)" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(255,255,255,0.06)",
                borderRadius: "8px",
                px: 1.5,
                py: 0.75,
                flexShrink: 0,
              }}
            >
              <Avatar
                src={icons[pool.base_token_id]}
                sx={{ width: 24, height: 24, fontSize: "0.7rem" }}
              >
                {pool.base_token_name?.[0]}
              </Avatar>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0 }}>
                {pool.base_token_name}
              </Typography>
            </Box>
            <TextField
              fullWidth
              variant="standard"
              type="number"
              value={baseInput}
              onChange={(e) => handleBaseChange(e.target.value)}
              placeholder="0.00"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "1.5rem",
                  fontWeight: 500,
                  "& input": { textAlign: "right", p: 0 },
                  "& input::placeholder": { opacity: 0.4 },
                },
              }}
            />
          </Box>
          {baseNum > 0 && (pool.base_token_name?.toLowerCase() === "erg" || isBaseStable) && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0, textAlign: "right", mt: 0.5 }}>
              {"\u2248"} ${formatFullNumber(isBaseStable ? baseNum : baseNum * ergPrice, 2)}
            </Typography>
          )}
        </Box>

        {/* Price / ratio info */}
        <Box
          sx={{
            borderRadius: "10px",
            bgcolor: "rgba(255,255,255,0.02)",
            border: "1px solid",
            borderColor: "divider",
            p: 2,
            mb: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 0.75,
              cursor: "pointer",
              "&:hover": { opacity: 0.8 },
            }}
            onClick={() => setRateInverted((v) => !v)}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              Pool rate
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
              {rateInverted
                ? `1 ${pool.quote_token_name} = ${formatFullNumber(1 / poolRatio, 4)} ${pool.base_token_name}`
                : `1 ${pool.base_token_name} = ${formatFullNumber(poolRatio, 4)} ${pool.quote_token_name}`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              Pool fee
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
              {pool.fee_pct.toFixed(1)}%
            </Typography>
          </Box>
          {lpTokensEstimate > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                Est. share of pool
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0 }}>
                {(lpTokensEstimate * 100).toFixed(4)}%
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Dexy warning */}
      {isDexy && showConfirmation && (
        <Box sx={{ px: 3 }}>
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
                Dexy LP Pool - Important Information
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ pl: 0.5 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><strong>2% withdrawal fee</strong> applies when removing liquidity</li>
                <li><strong>Withdrawal restrictions:</strong> Redemption is only available when the pool price is within 2% of the oracle price. During a depeg event, withdrawals may be temporarily blocked.</li>
                <li>These conditions are enforced by the on-chain contract and cannot be bypassed.</li>
              </ul>
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
          onClick={handleButtonClick}
          disabled={submitting || !baseInput || !quoteInput}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            background: showConfirmation
              ? `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`
              : "linear-gradient(135deg, #5C6BC0 0%, #7E57C2 100%)",
            border: "1px solid transparent",
            boxShadow: "none !important",
            transition: "all 0.2s",
            "&:hover": {
              background: showConfirmation
                ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`
                : "linear-gradient(135deg, #5C6BC0 0%, #9575CD 100%)",
              opacity: 0.9,
            },
            "&.Mui-disabled": {
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)",
            },
          }}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting
            ? "Adding Liquidity..."
            : showConfirmation
              ? "I Understand, Add Liquidity"
              : "Add Liquidity"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default AddLiquidityModal;
