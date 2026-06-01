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
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { formatNumber, formatFullNumber } from "@lib/utils/general";

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface TradeConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  direction: "forward" | "reverse";
  inputAmount: string;
  inputToken: TokenInfo;
  outputAmount: string;
  outputToken: TokenInfo;
  priceImpact: number;
  lpFeePercent?: number;
  feeAmount: number;
  feeToken: string;
  feeUsd: number;
  minerFee: number;
  ergPrice: number;
  executing: boolean;
}

const TradeConfirmationModal: FC<TradeConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  direction,
  inputAmount,
  inputToken,
  outputAmount,
  outputToken,
  priceImpact,
  lpFeePercent,
  feeAmount,
  feeToken,
  feeUsd,
  minerFee,
  ergPrice,
  executing,
}) => {
  const theme = useTheme();

  const inputUsd =
    parseFloat(inputAmount) *
    (inputToken.tokenId ===
    "0000000000000000000000000000000000000000000000000000000000000000"
      ? ergPrice
      : inputToken.price * ergPrice);
  const outputUsd =
    parseFloat(outputAmount) *
    (outputToken.tokenId ===
    "0000000000000000000000000000000000000000000000000000000000000000"
      ? ergPrice
      : outputToken.price * ergPrice);

  const highImpact = priceImpact > 5;

  return (
    <Dialog
      open={open}
      onClose={executing ? undefined : onClose}
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
          Confirm {direction === "reverse" ? "Buy" : "Sell"}
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={executing}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 0 }}>
        {/* You Pay */}
        <Box
          sx={{
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid",
            borderColor: "divider",
            p: 2,
            mb: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            You Pay
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar src={inputToken.icon} sx={{ width: 28, height: 28 }} />
              <Typography variant="h6" fontWeight={600}>
                {inputToken.ticker}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h6" fontWeight={600}>
                {formatFullNumber(parseFloat(inputAmount), inputToken.decimals > 4 ? 4 : inputToken.decimals)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ~${formatFullNumber(inputUsd, 2)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Arrow */}
        <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
          <ArrowDownwardIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        </Box>

        {/* You Receive */}
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
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            You Receive
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar src={outputToken.icon} sx={{ width: 28, height: 28 }} />
              <Typography variant="h6" fontWeight={600}>
                {outputToken.ticker}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h6" fontWeight={600}>
                {formatFullNumber(parseFloat(outputAmount), outputToken.decimals > 4 ? 4 : outputToken.decimals)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ~${formatFullNumber(outputUsd, 2)}
              </Typography>
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
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              Price Impact
            </Typography>
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{
                color:
                  priceImpact > 5
                    ? theme.palette.error.main
                    : priceImpact > 2
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
              }}
            >
              {priceImpact.toFixed(2)}%
            </Typography>
          </Box>
          {lpFeePercent != null && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                LP Fee
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {lpFeePercent.toFixed(2)}%
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              Service Fee
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatFullNumber(
                feeAmount / Math.pow(10, feeToken === "erg" ? 9 : 4),
                4,
              )}{" "}
              {feeToken.toUpperCase()}
              {feeUsd > 0 && ` (~$${feeUsd.toFixed(4)})`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Miner Fee
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {(minerFee / 1e9).toFixed(4)} ERG
            </Typography>
          </Box>
        </Box>

        {/* High impact warning */}
        {highImpact && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
              borderRadius: "10px",
              bgcolor: `${theme.palette.error.main}15`,
              border: `1px solid ${theme.palette.error.main}44`,
              mb: 1,
            }}
          >
            <WarningAmberIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
              High price impact! You may receive significantly less than expected.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Box sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onConfirm}
          disabled={executing}
          color={direction === "reverse" ? "success" : "error"}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
          }}
          startIcon={executing ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {executing
            ? "Confirming..."
            : `Confirm ${direction === "reverse" ? "Buy" : "Sell"}`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default TradeConfirmationModal;
