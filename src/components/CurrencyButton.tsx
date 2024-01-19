import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { Currencies, CURRENCIES_VALUES } from '@lib/utils/currencies';

interface ICurrencyButton {
  currency: Currencies;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
}

const CurrencyButton: FC<ICurrencyButton> = ({ currency, setCurrency }) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newCurrency: Currencies
  ) => {
    setCurrency(newCurrency);
  };

  return (
    <ToggleButtonGroup
      size="small"
      value={currency}
      exclusive
      onChange={handleChange}
      aria-label="Platform"
    >
      {CURRENCIES_VALUES.map((curr) => (
        <ToggleButton key={curr} value={curr}>
          {curr}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default CurrencyButton;