import React, { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { PoolOption } from "./poolOptions";

export const NEW_CRUX_POOL = "__new_crux_pool__";

interface PoolSelectorProps {
  options: PoolOption[];
  value: string;
  onChange: (value: string) => void;
}

const PoolSelector: FC<PoolSelectorProps> = ({ options, value, onChange }) => (
  <TextField
    select
    fullWidth
    size="small"
    label="Pool"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    sx={{ mb: 2 }}
  >
    {options.map((o) => (
      <MenuItem key={o.poolId} value={o.poolId} disabled={o.disabled}>
        {o.label}
      </MenuItem>
    ))}
    <MenuItem value={NEW_CRUX_POOL}>New Crux pool…</MenuItem>
  </TextField>
);

export default PoolSelector;
