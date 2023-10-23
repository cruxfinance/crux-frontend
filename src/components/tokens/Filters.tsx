import React, { FC, useState, useEffect, useRef } from "react";
import {
  Typography,
  Box,
  Grid,
  TextField,
  Divider,
  IconButton,
  Button,
  DialogContent,
  DialogActions,
  Dialog
} from "@mui/material";
import { IFilters } from "@pages/tokens";
import ClearIcon from "@mui/icons-material/Clear";
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

interface ITokenFilterProps {
  filters: IFilters;
  setFilters: React.Dispatch<React.SetStateAction<IFilters>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type FilterKey =
  'price' |
  'liquidity' |
  'market_cap' |
  'pct_change' |
  'volume' |
  'buys' |
  'sells';

const filterConfig: { title: string; variableName: FilterKey }[] = [
  { title: "Price", variableName: "price" },
  { title: "Liquidity", variableName: "liquidity" },
  { title: "Market Cap", variableName: "market_cap" },
  { title: "Percent Change", variableName: "pct_change" },
  { title: "Volume", variableName: "volume" },
  { title: "Buys", variableName: "buys" },
  { title: "Sells", variableName: "sells" },
];

const TokenFilterOptions: FC<ITokenFilterProps> = ({ filters, setFilters, open, setOpen }) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const handleSave = () => {
    const newFilters = Object.entries(inputValues)
      .reduce((acc, [key, value]) => {
        acc[key] = key.includes('pct') ? Number(value) * 100 : Number(value)
        return acc;
      }, {} as Record<string, number>)
    setFilters(newFilters)
    setOpen(false)
  }

  const handleReset = () => {
    setFilters({})
    setInputValues({})
  };

  const handleChangeFilters = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const initInputValues = Object.entries(filters)
      .reduce((acc, [key, value]) => {
        acc[key] = key.includes('pct') ? (value / 100).toString() : value.toString() // account for the backend using 100 as 1 pct
        return acc;
      }, {} as Record<string, string>)
    setInputValues(initInputValues)
  }, [])

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <Typography variant="h5" sx={{ mb: 0 }}>Filter</Typography>
        <Divider sx={{ mb: 2 }} />

        {filterConfig.map(filter => (
          <Filter
            key={filter.variableName}
            inputValues={inputValues}
            setInputValues={setInputValues}
            handleChangeFilters={handleChangeFilters}
            title={filter.title}
            variableName={filter.variableName}
          />
        ))}
      </DialogContent>
      <DialogActions sx={{ pb: 2, pr: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outlined" onClick={handleReset}>
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TokenFilterOptions;

const Filter: FC<{
  handleChangeFilters: Function;
  title: string;
  variableName: FilterKey;
  inputValues: Record<string, string>;
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({
  handleChangeFilters,
  title,
  variableName,
  inputValues,
  setInputValues
}) => {
    const handleClear = () => {
      setInputValues(prev => {
        const newState = { ...prev };
        delete newState[variableName + 'Min'];
        delete newState[variableName + 'Max'];
        return newState;
      });
    }
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
              name={`${variableName}_min`}
              value={inputValues[`${variableName}_min`] || ''}
              onChange={(e: any) => handleChangeFilters(e)}
            />
          </Grid>
          <Grid item xs={5} sm={3}>
            <TextField
              fullWidth
              variant="filled"
              id={`${variableName}-max-filter`}
              placeholder={`Max`}
              name={`${variableName}_max`}
              value={inputValues[`${variableName}_max`] || ''}
              onChange={(e: any) => handleChangeFilters(e)}
            />
          </Grid>
          <Grid item xs={2}>
            <IconButton onClick={handleClear}>
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Box>
    )
  }