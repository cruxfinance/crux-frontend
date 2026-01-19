import React, { FC, useState } from "react";
import {
  Box,
  Typography,
  Slider,
  TextField,
  Collapse,
  InputAdornment,
} from "@mui/material";
import { MIN_MINER_FEE } from "@contexts/MinerFeeContext";

const ERG_DECIMALS = 9;
const ERG_MULTIPLIER = 10 ** ERG_DECIMALS; // 1_000_000_000
export const MAX_SLIDER_FEE = 10_000_000_000; // 10 ERG in nanoERG

interface MinerFeeSelectorProps {
  minerFee: number; // in nanoERG
  onChange: (fee: number) => void; // callback with nanoERG
  disabled?: boolean;
  ergPrice?: number | null; // ERG price in USD for displaying fee value
}

export const MinerFeeSelector: FC<MinerFeeSelectorProps> = ({
  minerFee,
  onChange,
  disabled = false,
  ergPrice = null,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Convert nanoERG to ERG for display
  const feeInErg = minerFee / ERG_MULTIPLIER;

  // Slider uses logarithmic scale for better UX
  const sliderValue = Math.log10(Math.max(minerFee, MIN_MINER_FEE));
  const minSliderValue = Math.log10(MIN_MINER_FEE);
  const maxSliderValue = Math.log10(MAX_SLIDER_FEE);

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const newFee = Math.round(Math.pow(10, value as number));
    onChange(newFee);
    setInputValue("");
    setIsEditing(false);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
    setInputValue(formatFee(minerFee));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.001) {
      const nanoErg = Math.round(numValue * ERG_MULTIPLIER);
      onChange(nanoErg);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    // Validate and enforce minimum
    if (minerFee < MIN_MINER_FEE) {
      onChange(MIN_MINER_FEE);
    }
    setInputValue("");
  };

  // Format the fee for display
  const formatFee = (fee: number): string => {
    const erg = fee / ERG_MULTIPLIER;
    if (erg < 0.01) {
      return erg.toFixed(4);
    } else if (erg < 1) {
      return erg.toFixed(3);
    } else {
      return erg.toFixed(2);
    }
  };

  // Display value for text field: show input value when editing, otherwise show current fee
  const getTextFieldValue = (): string => {
    if (isEditing) {
      return inputValue;
    }
    return formatFee(minerFee);
  };

  // Format USD value
  const getUsdValue = (): string | null => {
    if (!ergPrice) return null;
    const usdValue = feeInErg * ergPrice;
    return `~$${usdValue.toFixed(4)}`;
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Miner Fee
        </Typography>
        <Typography
          variant="caption"
          onClick={() => !disabled && setExpanded(!expanded)}
          sx={{
            cursor: disabled ? "default" : "pointer",
            "&:hover": disabled ? {} : { textDecoration: "underline" },
          }}
        >
          {formatFee(minerFee)} ERG{getUsdValue() && ` (${getUsdValue()})`}
        </Typography>
      </Box>

      <Collapse in={expanded && !disabled}>
        <Box
          sx={{
            mt: 1.5,
            px: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Slider
            value={sliderValue}
            min={minSliderValue}
            max={maxSliderValue}
            step={0.01}
            onChange={handleSliderChange}
            size="small"
            sx={{ flex: 1, mr: 1 }}
          />
          <TextField
            size="small"
            value={getTextFieldValue()}
            onFocus={handleInputFocus}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    ERG
                  </Typography>
                </InputAdornment>
              ),
              inputProps: {
                min: 0.001,
                step: 0.001,
              },
            }}
            sx={{ width: 130 }}
          />
        </Box>
      </Collapse>
    </Box>
  );
};
