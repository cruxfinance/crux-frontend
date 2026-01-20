import React, { FC, useState } from "react";
import {
  Box,
  FormControlLabel,
  IconButton,
  Popover,
  Typography,
  Switch,
  useTheme,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { MinerFeeSelector } from "./MinerFeeSelector";

interface WidgetSettingsProps {
  feeToken: "erg" | "crux";
  onFeeTokenChange: (token: "erg" | "crux") => void;
  minerFee: number;
  onMinerFeeChange: (fee: number) => void;
  disabled?: boolean;
  ergPrice?: number | null;
}

export const WidgetSettings: FC<WidgetSettingsProps> = ({
  feeToken,
  onFeeTokenChange,
  minerFee,
  onMinerFeeChange,
  disabled = false,
  ergPrice = null,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        disabled={disabled}
        sx={{
          color: theme.palette.primary.main,
          transition: "transform 0.3s ease-in-out",
          "&:hover": {
            color: theme.palette.primary.main,
            backgroundColor: `${theme.palette.primary.main}15`,
          },
          ...(open && {
            animation: "spin 0.5s ease-in-out",
          }),
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(180deg)" },
          },
        }}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              minWidth: 280,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[4],
            },
          },
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            mb: 2,
            pb: 1,
            textAlign: "center",
            fontWeight: 600,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          Settings
        </Typography>

        {/* Fee Token Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={feeToken === "crux"}
              onChange={(e) =>
                onFeeTokenChange(e.target.checked ? "crux" : "erg")
              }
              size="small"
            />
          }
          label="Pay fee in CRUX"
          labelPlacement="start"
          sx={{
            mb: 2,
            mx: 0,
            width: "100%",
            justifyContent: "space-between",
            "& .MuiFormControlLabel-label": {
              fontSize: "0.875rem",
            },
          }}
        />

        {/* Miner Fee Selector */}
        <Box>
          <MinerFeeSelector
            minerFee={minerFee}
            onChange={onMinerFeeChange}
            disabled={disabled}
            ergPrice={ergPrice}
            defaultExpanded
            compactMode
          />
        </Box>
      </Popover>
    </>
  );
};
