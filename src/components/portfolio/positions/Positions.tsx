import React, { FC, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  useTheme,
  // useMediaQuery,
  Avatar,
  Switch,
  FormControlLabel
} from "@mui/material";
import { currencies, Currencies } from '@lib/utils/currencies';
import { formatNumber } from '@lib/utils/general';
import { trpc } from '@lib/trpc';
import CruxTableScroll from '@components/CruxTableScroll';
import CurrencyButton from '@components/CurrencyButton';
import dayjs from 'dayjs';
import { colorSwitch } from '@lib/utils/color';

type PositionsProps = {
  currency: Currencies;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
  addressList: string[];
}

const Positions: FC<PositionsProps> = ({ currency, addressList, setCurrency }) => {
  const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  // const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]
  const positions = trpc.portfolio.getPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const [tableData, setTableData] = useState<{ [key: string]: string | React.ReactNode }[]>([])
  const [closedPositionsToggle, setClosedPositionsToggle] = useState(false);

  const headers = [
    ["Name"],
    ["Qty"],
    ["Current Price", "Current Value"],
    ["P/L Day", "P/L Day (%)"],
    ["Cost Per Token", "Total Cost"],
    ["Open Date"],
    ["P/L Open", "P/L Open (%)"],
    ["P/L YTD", "P/L YTD (%)"],
  ];

  const symbolWithName = (name: string, tokenId: string) => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
          zIndex: 1
        }}
      >
        <Box sx={{ mr: 1, py: '2px' }}>
          <Avatar
            src={"icons/tokens/" + tokenId + ".svg"}
            sx={{ width: "24px", height: "24px" }}
          />
        </Box>
        <Box>
          <Typography sx={{ textOverflow: "ellipsis" }}>
            {name}
          </Typography>
        </Box>
      </Box>
    )
  }

  const formatPL = (value: number, currencySymbol: string, isPercentage = false) => {
    return (
      <Typography sx={{ color: colorSwitch(value, theme) }}>
        {`${value < 0 ? "-" : ''}${currencySymbol}${formatNumber(value, 2, undefined, true)}${isPercentage ? '%' : ''}`}
      </Typography>
    );
  };

  useEffect(() => {
    if (positions.data) {
      setTableData(
        positions.data.filter((item) => {
          if (!closedPositionsToggle) {
            return item.tokenAmount > 0;
          }
          return true;
        }).map((item) => {
          const {
            tokenId,
            tokenName,
            tokenAmount,
            tradeDate,
            lastPrice,
            costBasis,
            pnlOpen,
            pnlOpenPct,
            pnlDay,
            pnlDayPct,
            pnlYear,
            pnlYearPct,
            totalCost,
            totalValue
          } = item

          const currentCurrency = currency.toLowerCase()
          const date = dayjs(tradeDate * 1000).format("YYYY/MM/DD");
          return {
            "Name": symbolWithName(tokenName, tokenId),
            "Qty": formatNumber(tokenAmount),
            "Current Price": `${currencySymbol}${formatNumber(lastPrice[currentCurrency as keyof PriceInfo])}`,
            "Cost Per Token": `${currencySymbol}${formatNumber(costBasis[currentCurrency as keyof PriceInfo])}`,
            "Total Cost": `${currencySymbol}${formatNumber(totalCost[currentCurrency as keyof PriceInfo])}`,
            "Current Value": `${currencySymbol}${formatNumber(totalValue[currentCurrency as keyof PriceInfo])}`,
            "Open Date": date,
            "P/L Open": formatPL(pnlOpen[currentCurrency as keyof PriceInfo], currencySymbol),
            "P/L Open (%)": formatPL(pnlOpenPct[currentCurrency as keyof PriceInfo], '', true),
            "P/L Day": formatPL(pnlDay[currentCurrency as keyof PriceInfo], currencySymbol),
            "P/L Day (%)": formatPL(pnlDayPct[currentCurrency as keyof PriceInfo], '', true),
            "P/L YTD": formatPL(pnlYear[currentCurrency as keyof PriceInfo], currencySymbol),
            "P/L YTD (%)": formatPL(pnlYearPct[currentCurrency as keyof PriceInfo], '', true)
          }
        })
      )
    }
  }, [positions.data, currency, closedPositionsToggle])

  const tableActions = <>
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={closedPositionsToggle}
          onChange={(e) => setClosedPositionsToggle(e.target.checked)}
          sx={{ mr: 1 }}
        />
      }
      label="Show closed positions"
    />
    <CurrencyButton currency={currency} setCurrency={setCurrency} />
  </>

  return (
    <Box>
      <CruxTableScroll
        title="Token Positions"
        actions={tableActions}
        headers={headers}
        data={tableData}
        loading={positions.isLoading}
      />
    </Box>
  );
};

export default Positions;