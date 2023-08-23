import React, { FC, useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Grid
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { SxProps } from "@mui/material";
import { ISorting } from '@src/pages/tokens';

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
      <Grid container direction="row">
        <Grid>
          <Select
            id="sort-select-box"
            variant="filled"
            value={sorting.sort_by}
            onChange={handleSortSelection}
            aria-label="Select sorting item"
          >
            <MenuItem value={"price"}>Price</MenuItem>
            <MenuItem value={"liquidity"}>Liquidity</MenuItem>
            <MenuItem value={"mktCap"}>Market Cap</MenuItem>
            <MenuItem value={"pctChange"}>Percent Change</MenuItem>
            <MenuItem value={"Volume"}>Volume</MenuItem>
            <MenuItem value={"sells"}>Sells</MenuItem>
            <MenuItem value={"buys"}>Buys</MenuItem>
            <MenuItem value={"totalTransactions"}>Total transactions</MenuItem>

          </Select>
        </Grid>
        <Grid>
          <ToggleButtonGroup value={sorting.sort_order} exclusive onChange={handleToggle}>
            <ToggleButton value="Asc" aria-label="Sort by ascending">Asc</ToggleButton>
            <ToggleButton value="Desc" aria-label="Sort by descending">Dec</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>


    </FormControl>
  );
};

export default TokenSort;