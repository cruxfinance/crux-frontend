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
import CurrencyButton from '@components/CurrencyButton';
import CruxTableScroll from '@components/CruxTableScroll';

type StakedPositionsProps = {
  currency: Currencies;
  setCurrency: React.Dispatch<React.SetStateAction<Currencies>>;
  addressList: string[];
}

const StakedPositions: FC<StakedPositionsProps> = ({ currency, addressList, setCurrency }) => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  // const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency]
  const stakedPositions = trpc.portfolio.getStakedPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const [tableData, setTableData] = useState<{ [key: string]: string | React.ReactNode }[]>([])

  const headers = [
    ["Name"],
    ["Total Stake"],
    ["Current Value"],
    ["Staked Amount", "Total Rewards"],
    ["Withdrawn Amount"]
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

  useEffect(() => {
    if (stakedPositions.data) {
      setTableData(
        stakedPositions.data.map((item: TStakedTokenData) => {
          const {
            tokenId,
            tokenName,
            stakedAmount,
            unstakedAmount,
            rewardAmount,
            currentPrice
          } = item

          const currentCurrency = currency.toLowerCase()

          const totalStake = stakedAmount + rewardAmount - unstakedAmount;

          return {
            "Name": symbolWithName(tokenName, tokenId),
            "Total Stake": formatNumber(totalStake),
            "Current Value": `${currencySymbol}${formatNumber(totalStake * currentPrice[currentCurrency as keyof PriceInfo])}`,
            "Staked Amount": formatNumber(stakedAmount),
            "Total Rewards": formatNumber(rewardAmount),
            "Withdrawn Amount": formatNumber(unstakedAmount)
          }
        })
      )
    }
  }, [stakedPositions.data, currency])

  const tableActions = <>
    <CurrencyButton currency={currency} setCurrency={setCurrency} />
  </>

  return (
    <Box>
      <CruxTableScroll
        title="Staking Positions"
        actions={tableActions}
        headers={headers}
        data={tableData}
        loading={stakedPositions.isLoading}
      />
    </Box>
  );
};

export default StakedPositions;