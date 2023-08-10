import React, { FC, useState, useEffect, useRef } from "react";
import {
  Typography,
  Box,
  Grid,
  TextField,
  Divider,
  IconButton,
  Button
} from "@mui/material";
import { IFilters } from "@src/pages/tokens";
import ClearIcon from "@mui/icons-material/Clear";

interface ITokenFilterProps {
  filters: IFilters;
  setFilters: React.Dispatch<React.SetStateAction<IFilters>>;
}

// priceMin?: number;
// priceMax?: number;
// liquidityMin?: number;
// liquidityMax?: number;
// mktCapMin?: number;
// mktCapMax?: number;
// pctChangeMin?: number;
// pctChangeMax?: number;
// volMin?: number;
// volMax?: number;
// buysMin?: number;
// buysMax?: number;
// sellsMin?: number;
// sellsMax?: number;

type FilterKey =
  'price' |
  'liquidity' |
  'mktCap' |
  'pctChange' |
  'vol' |
  'buys' |
  'sells';

const filterConfig: { title: string; variableName: FilterKey }[] = [
  { title: "Price", variableName: "price" },
  { title: "Liquidity", variableName: "liquidity" },
  { title: "Market Cap", variableName: "mktCap" },
  { title: "Percent Change", variableName: "pctChange" },
  { title: "Volume", variableName: "vol" },
  { title: "Buys", variableName: "buys" },
  { title: "Sells", variableName: "sells" },
];

const TokenFilterOptions: FC<ITokenFilterProps> = ({ filters, setFilters }) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const handleSave = () => {
    const newFilters = Object.entries(inputValues)
      .reduce((acc, [key, value]) => {
        acc[key] = Number(value)
        return acc;
      }, {} as Record<string, number>)
    setFilters(newFilters)
  }

  const handleReset = () => {
    setFilters({})
  };

  const handleChangeFilters = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Update the local state for the input
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0 }}>Filter</Typography>
      <Divider sx={{ mb: 2 }} />

      {filterConfig.map(filter => (
        <Filter
          key={filter.variableName}
          inputValues={inputValues}
          handleChangeFilters={handleChangeFilters}
          title={filter.title}
          variableName={filter.variableName}
        />
      ))}

      <Button variant="contained" onClick={handleSave}>
        Save
      </Button>
      <Button variant="outlined" onClick={handleReset}>
        Reset
      </Button>
    </>
  );
};

export default TokenFilterOptions;

const Filter: FC<{
  handleChangeFilters: Function;
  title: string;
  variableName: FilterKey;
  inputValues: Record<string, string>;
}> = ({
  handleChangeFilters,
  title,
  variableName,
  inputValues
}) => {
    return (
      <Box sx={{ mb: 2, maxWidth: '500px' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {title}
            </Typography>
          </Grid>
          <Grid item xs={5} sm={3}>
            <TextField
              fullWidth
              variant="filled"
              id={`${variableName}-min-filter`}
              placeholder={`Min`}
              name={`${variableName}Min`}
              value={inputValues[`${variableName}Min`] || ''}
              onChange={(e: any) => handleChangeFilters(e)}
            />
          </Grid>
          <Grid item xs={5} sm={3}>
            <TextField
              fullWidth
              variant="filled"
              id={`${variableName}-max-filter`}
              placeholder={`Max`}
              name={`${variableName}Max`}
              value={inputValues[`${variableName}Max`] || ''}
              onChange={(e: any) => handleChangeFilters(e)}
            />
          </Grid>
          <Grid item xs={2}>
            <IconButton>
              <ClearIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Box>
    )
  }