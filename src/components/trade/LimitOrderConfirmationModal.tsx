import React, { FC } from "react";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { formatNumber } from "@lib/utils/general";

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface LimitOrderConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderType: "buy" | "sell";
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  price: string;
  amount: string;
  total: string;
  marketPrice: number;
  ergPrice: number;
  feeEstimate: {
    fee_amount: number;
    fee_token: string;
    fee_usd: number;
  } | null;
  minerFee: number;
  expiryLabel: string | null;
  submitting: boolean;
}

const LimitOrderConfirmationModal: FC<LimitOrderConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  orderType,
  baseToken,
  quoteToken,
  price,
  amount,
  total,
  marketPrice,
  ergPrice,
  feeEstimate,
  minerFee,
  expiryLabel,
  submitting,
}) => {
  const theme = useTheme();

  const priceFloat = parseFloat(price);
  const marketDiff = marketPrice > 0
    ? ((priceFloat - marketPrice) / marketPrice) * 100
    : 0;
  const isAboveMarket = marketDiff > 0;
  // Buy below market = favorable, sell above market = favorable
  const isFavorable = orderType === "sell" ? isAboveMarket : !isAboveMarket;

  const totalUsd = parseFloat(total) * ergPrice;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "1px solid rgba(200, 225, 255, 0.08)",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Confirm Limit {orderType === "buy" ? "Buy" : "Sell"}
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 0 }}>
        {/* Order summary: amount @ price */}
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
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar src={baseToken.icon} sx={{ width: 28, height: 28 }} />
              <Typography variant="h6" fontWeight={600}>
                {formatNumber(parseFloat(amount), baseToken.decimals > 4 ? 4 : baseToken.decimals)} {baseToken.ticker}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: "6px",
                fontWeight: 600,
                bgcolor: orderType === "buy"
                  ? `${theme.palette.success.main}20`
                  : `${theme.palette.error.main}20`,
                color: orderType === "buy"
                  ? theme.palette.success.main
                  : theme.palette.error.main,
              }}
            >
              {orderType === "buy" ? "BUY" : "SELL"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Limit Price
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                component="img"
                src={quoteToken.icon}
                sx={{ width: 18, height: 18, borderRadius: "50%" }}
              />
              {formatNumber(priceFloat, 6)} {quoteToken.ticker}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" fontWeight={500}>
                {formatNumber(parseFloat(total), quoteToken.decimals > 4 ? 4 : quoteToken.decimals)} {quoteToken.ticker}
              </Typography>
              {totalUsd > 0 && (
                <Typography variant="caption" color="text.secondary">
                  ~${formatNumber(totalUsd, 2)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Details */}
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
          {/* vs Market */}
          {marketPrice > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                vs Market Price
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{
                  color: Math.abs(marketDiff) < 0.1
                    ? theme.palette.text.secondary
                    : isFavorable
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                }}
              >
                {isAboveMarket ? "+" : ""}{marketDiff.toFixed(2)}% {isAboveMarket ? "above" : "below"}
              </Typography>
            </Box>
          )}

          {/* Expiry */}
          {expiryLabel && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                Expires In
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {expiryLabel}
              </Typography>
            </Box>
          )}

          {/* Executor Fee */}
          {feeEstimate && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                Executor Fee
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {feeEstimate.fee_token === "erg"
                  ? `${(feeEstimate.fee_amount / 1e9).toFixed(4)} ERG`
                  : `${feeEstimate.fee_amount} CRUX`}
                {feeEstimate.fee_usd > 0 && ` (~$${feeEstimate.fee_usd.toFixed(4)})`}
              </Typography>
            </Box>
          )}

          {/* Miner Fee */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              Miner Fee
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {(minerFee / 1e9).toFixed(4)} ERG
            </Typography>
          </Box>

          {/* Fee Reserve */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Fee Reserve (20 fills)
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {((minerFee * 20) / 1e9).toFixed(4)} ERG
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onConfirm}
          disabled={submitting}
          color={orderType === "buy" ? "success" : "error"}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
          }}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting
            ? "Submitting..."
            : `Place ${orderType === "buy" ? "Buy" : "Sell"} Order`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default LimitOrderConfirmationModal;
