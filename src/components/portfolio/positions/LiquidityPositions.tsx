import React, { FC, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  // useTheme,
  // useMediaQuery,
  Avatar
} from "@mui/material";
import { currencies, Currencies } from '@lib/utils/currencies';
import { formatNumber } from '@lib/utils/general';
import { trpc } from '@lib/trpc';
import CruxTableScroll from '@components/CruxTableScroll';
import CurrencyButton from '@components/CurrencyButton';

type LiquidityPositionsProps = {
  currency: Currencies;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
  addressList: string[];
}

const LiquidityPositions: FC<LiquidityPositionsProps> = ({ currency, addressList, setCurrency }) => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  // const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]
  const lpPositions = trpc.portfolio.getLpPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const [tableData, setTableData] = useState<{ [key: string]: string | React.ReactNode }[]>([])

  const headers = [
    ["Paired Token", "Base Token"],
    ["Total Value"],
    ["Pair Qty", "Base Qty"],
    ["Pair Price", "Base Price"],
    ["Initial Pair Qty", "Initial Base Qty"]
  ];

  const extraInfo = [
    {
      index: 4,
      text: 'Displays the amounts added when LP position was opened (if this address opened the LP position)'
    }
  ]

  const symbolWithName = (name: string, tokenId: string) => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
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

  const calcTotalPrice = (baseQty: number, basePrice: number, quoteQty: number, quotePrice: number) => {
    return ((baseQty * basePrice) + (quoteQty * quotePrice)).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  useEffect(() => {
    if (lpPositions.data) {
      setTableData(
        lpPositions.data.map((item) => {
          const {
            baseTokenId,
            baseTokenName,
            quoteTokenId,
            quoteTokenName,
            baseProvidedAmount,
            quoteProvidedAmount,
            baseCurrentAmount,
            quoteCurrentAmount,
            baseCurrentPrice,
            quoteCurrentPrice
          } = item

          const currentCurrency = currency.toLowerCase()

          return {
            "Paired Token": symbolWithName(quoteTokenName, quoteTokenId),
            "Base Token": symbolWithName(baseTokenName, baseTokenId),
            "Total Value": `${currencySymbol}${calcTotalPrice(baseCurrentAmount, baseCurrentPrice[currentCurrency as keyof PriceInfo], quoteCurrentAmount, quoteCurrentPrice[currentCurrency as keyof PriceInfo])}`,
            "Pair Qty": quoteCurrentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            "Base Qty": baseCurrentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            "Pair Price": `${currencySymbol}${formatNumber(quoteCurrentPrice[currentCurrency as keyof PriceInfo])}`,
            "Base Price": `${currencySymbol}${formatNumber(baseCurrentPrice[currentCurrency as keyof PriceInfo])}`,
            "Initial Pair Qty": quoteProvidedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            "Initial Base Qty": baseProvidedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })
          }
        })
      )
    }
  }, [lpPositions.data, currency])

  const tableActions = <CurrencyButton currency={currency} setCurrency={setCurrency} />

  return (
    <Box>
      <CruxTableScroll
        title="Liquidity Positions"
        actions={tableActions}
        headers={headers}
        data={tableData}
        loading={lpPositions.isLoading}
      />
    </Box>
  );
};

export default LiquidityPositions;