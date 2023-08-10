import React, { FC, useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
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
  const handleChange = (event: SelectChangeEvent) => {
    const [field, sort] = event.target.value.split('-');
    setSorting(prevSort => ({
      ...prevSort,
      sortBy: field,
      sortOrder: sort === 'asc' ? 'ASC' : 'DEC'
    }));
  };

  return (
    <FormControl fullWidth sx={sx} variant="filled">
      <Select
        id="sort-select-box"
        variant="filled"
        value={`${sorting.sortBy}-${sorting.sortOrder?.toLowerCase()}`}
        onChange={handleChange}
      >
        <MenuItem value={"price-asc"}>Price: low to high</MenuItem>
        <MenuItem value={"price-dec"}>Price: high to low</MenuItem>
        <MenuItem value={"vol-asc"}>Volume: low to high</MenuItem>
        <MenuItem value={"vol-dec"}>Volume: high to low</MenuItem>
        <MenuItem value={"mktCap-asc"}>Market Cap: low to high</MenuItem>
        <MenuItem value={"mktCap-dec"}>Market Cap: high to low</MenuItem>
      </Select>
    </FormControl>
  );
};

export default TokenSort;