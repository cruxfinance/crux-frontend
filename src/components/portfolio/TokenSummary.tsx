import React, { FC, useState, useEffect, useRef } from "react";
import { Typography, Container, Box, Avatar, useTheme } from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { PieChart, IPieToken } from "@components/charts/PieChart";
import { currencies, Currencies } from "@lib/utils/currencies";
import { IReducedToken } from "@pages/portfolio";
import { generateGradient } from "@lib/utils/color";
import { formatNumber, adjustDecimals } from "@lib/utils/general";

export type IActiveToken = {
  name: string;
  amount: number;
  value: number;
  color: string;
} | null;

interface ITokenSummary {
  tokenList: IReducedToken[];
  totalValue: number;
  currency: Currencies;
  boxHeight: string;
  exchangeRate: number;
  setBoxHeight: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

const TokenSummary: FC<ITokenSummary> = ({
  tokenList,
  currency,
  boxHeight,
  setBoxHeight,
  setLoading,
  totalValue,
  exchangeRate,
}) => {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [reducedTokensList, setReducedTokensList] = useState<IPieToken[]>([]);
  const [combinedTokensList, setCombinedTokensList] = useState<IReducedToken[]>(
    []
  );
  const [reducedTokensListUSD, setReducedTokensListUSD] = useState<IPieToken[]>(
    []
  );
  const [colors, setColors] = useState<string[]>([]);
  const [smallValuesExist, setSmallValuesExist] = useState(false);
  const theme = useTheme();
  const pieChartRef = useRef<HTMLElement | null>(null);
  const currencySymbol = currencies[currency];

  useEffect(() => {
    if (pieChartRef.current) {
      const height = pieChartRef.current.offsetHeight;
      setBoxHeight(`${height}px`);
      setLoading((prev) => {
        return {
          ...prev,
          tokenSummary: false,
        };
      });
    }
  }, [pieChartRef]);

  useEffect(() => {
    const aggregatedTokens: IReducedToken[] = tokenList.reduce(
      (acc: IReducedToken[], token) => {
        const existingToken = acc.find((t) => t.name === token.name);
        if (existingToken) {
          existingToken.amount += token.amount;
        } else {
          acc.push({ ...token });
        }

        return acc;
      },
      []
    );

    const sortedAggregateTokens = aggregatedTokens.sort(
      (a, b) => b.amount * b.value - a.amount * a.value
    );

    // remove any tokens that aren't at least 1% of the portfolio value, for the pie chart
    const filteredTokens = sortedAggregateTokens.filter((token) => {
      return token.amount * token.value > totalValue * 0.01;
    });

    const remainder = sortedAggregateTokens.reduce((accumulator, token) => {
      if (token.amount * token.value < totalValue * 0.01) {
        return accumulator + token.amount * token.value;
      }
      return accumulator;
    }, 0);

    if (remainder > totalValue * 0.01) {
      setSmallValuesExist(true);
      filteredTokens.push({
        name: "small values",
        amount: remainder,
        value: 1,
        tokenId: "accumulated",
      });
    }

    setReducedTokensList(filteredTokens);
    setReducedTokensListUSD(
      filteredTokens.map((item) => {
        return {
          ...item,
          value: item.value * exchangeRate,
        };
      })
    );
    setCombinedTokensList(sortedAggregateTokens);
    setColors(generateGradient(filteredTokens.length));
  }, [tokenList, totalValue, exchangeRate]);

  return (
    <>
      <Grid container alignItems="center" sx={{ mb: 2 }}>
        <Grid xs>
          <Typography variant="h6">Wallet Summary</Typography>
        </Grid>
        <Grid>{tokenList.length + " "} Currencies</Grid>
      </Grid>

      <Grid container spacing={4} direction={{ xs: "column", md: "row" }}>
        <Grid>
          <Box ref={pieChartRef} sx={{ textAlign: "center" }}>
            <PieChart
              totalValue={totalValue}
              tokens={
                currency === "ERG" ? reducedTokensList : reducedTokensListUSD
              }
              currency={currency}
              colors={colors}
              activeSymbol={activeSymbol}
              setActiveSymbol={setActiveSymbol}
            />
          </Box>
        </Grid>
        <Grid xs>
          <Box sx={{ overflowY: "auto", height: boxHeight, mr: -2, pr: 2 }}>
            {combinedTokensList.map((item, i) => {
              const thisName =
                item.amount *
                  (currency === "ERG"
                    ? item.value
                    : item.value * exchangeRate) <
                (currency === "ERG" ? totalValue : totalValue * exchangeRate) *
                  0.01
                  ? "small values"
                  : item.name;
              const thisActive = thisName === activeSymbol;
              return (
                <Box
                  onMouseEnter={() =>
                    setActiveSymbol(
                      thisName === "small values" && smallValuesExist
                        ? thisName
                        : item.name
                    )
                  }
                  onMouseLeave={() => setActiveSymbol(null)}
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 1,
                    // mb: 2,
                    p: 1,
                    borderRadius: "8px",
                    background:
                      thisActive && thisName !== "small values"
                        ? theme.palette.background.paper
                        : "none",
                    "&:hover": {
                      background: theme.palette.background.paper,
                    },
                  }}
                  key={i + ":" + item.tokenId}
                >
                  <Box sx={{ pt: "2px" }}>
                    <Avatar
                      src={
                        "icons/tokens/" +
                        (item.wrappedTokenIds &&
                        (item.wrappedTokenIds as string[]).length > 0
                          ? item.wrappedTokenIds[0]
                          : item.tokenId) +
                        ".svg"
                      }
                      sx={{ width: "24px", height: "24px" }}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color:
                          thisActive &&
                          colors[i] !== undefined &&
                          thisName !== "small values"
                            ? colors[i]
                            : thisName === "small values" && thisActive
                            ? colors[colors.length - 1]
                            : theme.palette.text.primary,
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography sx={{ color: theme.palette.text.secondary }}>
                      {item.name.slice(0, 4).toUpperCase()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      sx={{ fontSize: "16px !important", fontWeight: 700 }}
                    >
                      {formatNumber(item.amount)} (
                      {currencySymbol +
                        formatNumber(
                          (currency === "ERG"
                            ? item.value
                            : item.value * exchangeRate) * item.amount
                        )}
                      )
                    </Typography>
                    {item.pctChange && (
                      <Typography
                        sx={{ fontSize: "16px !important", fontWeight: 700 }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            color:
                              item.pctChange < 0
                                ? theme.palette.down.main
                                : item.pctChange > 0
                                ? theme.palette.up.main
                                : theme.palette.text.secondary,
                            fontSize: "14px !important",
                          }}
                        >
                          {(item.pctChange * 0.01).toFixed(2)}%
                        </Typography>
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default TokenSummary;
