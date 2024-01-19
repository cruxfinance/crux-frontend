import React, { FC, useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Box
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { SxProps } from "@mui/material";

interface ITokenSortProps {
  sx?: SxProps;
  sorting: ISorting;
  setSorting: React.Dispatch<React.SetStateAction<ISorting>>;
}

const TokenSort: FC<ITokenSortProps> = ({ sx, sorting, setSorting }) => {
  const handleToggle = (event: React.MouseEvent<HTMLElement>, newValue: 'Desc' | 'Asc') => {
    if (newValue !== null) setSorting(prevSort => ({
      ...prevSort,
      sort_order: newValue,
    }));
  }
  const handleSortSelection = (event: SelectChangeEvent) => {
    setSorting(prevSort => ({
      ...prevSort,
      sort_by: event.target.value,
    }));
  };

  return (
    <FormControl fullWidth sx={sx} variant="filled">
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Box>
          <Select
            id="sort-select-box"
            variant="filled"
            value={sorting.sort_by}
            onChange={handleSortSelection}
            aria-label="Select sorting item"
            size="small"
            sx={{ height: '38px', borderRadius: '4px 0 0 4px' }}
          >
            <MenuItem value={"Price"}>Price</MenuItem>
            <MenuItem value={"Liquidity"}>Liquidity</MenuItem>
            <MenuItem value={"MarketCap"}>Market Cap</MenuItem>
            <MenuItem value={"PercentChange"}>Percent Change</MenuItem>
            <MenuItem value={"Volume"}>Volume</MenuItem>
            <MenuItem value={"Sells"}>Sells</MenuItem>
            <MenuItem value={"Buys"}>Buys</MenuItem>
            <MenuItem value={"TotalTransactions"}>Total transactions</MenuItem>
          </Select>
        </Box>
        <Box>
          <ToggleButtonGroup value={sorting.sort_order} exclusive onChange={handleToggle} size="small" sx={{ height: '38px' }}>
            <ToggleButton value="Asc" aria-label="Sort by ascending" sx={{ borderRadius: '0 4px 4px 0' }}>Asc</ToggleButton>
            <ToggleButton value="Desc" aria-label="Sort by descending">Dec</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>


    </FormControl>
  );
};

export default TokenSort;