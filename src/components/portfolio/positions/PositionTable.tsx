import React, { FC, useState, useEffect } from "react";
import {
  Typography,
  Container,
  Box,
  useTheme,
  Button,
  Paper,
  useMediaQuery,
  Avatar,
  FormControlLabel,
  Switch,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { currencies, Currencies } from "@lib/utils/currencies";
import { formatNumber } from "@lib/utils/general";
import { trpc } from "@lib/trpc";
import dayjs from "dayjs";

type PositionTableProps = {
  currency: Currencies;
  exchangeRate: number;
  addressList: string[];
};

const PositionTable: FC<PositionTableProps> = ({
  currency,
  exchangeRate,
  addressList,
}) => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const currencySymbol = currencies[currency];
  const positions = trpc.portfolio.getPositions.useQuery(
    { addresses: addressList },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
  const [closedPositionsToggle, setClosedPositionsToggle] = useState(false);

  const colorSwitch = (number: number) => {
    return number > 0
      ? theme.palette.up.main
      : number < 0
      ? theme.palette.down.main
      : theme.palette.text.secondary;
  };

  const isPriceInfo = (value: any): value is PriceInfo => {
    return (
      value && typeof value === "object" && ("erg" in value || "usd" in value)
    );
  };

  const getValueByCurrency = (
    token: TTokenData,
    valueKey: keyof TTokenData,
    currency: Currencies
  ): number => {
    const value = token[valueKey];

    if (isPriceInfo(value)) {
      if (currency === "ERG" && value.erg !== undefined) {
        return value.erg;
      } else if (currency === "USD" && value.usd !== undefined) {
        return value.usd;
      }
    }

    return 0;
  };

  return (
    <Paper
      sx={{ py: 3, px: 0, width: "100%", height: "100%", position: "relative" }}
    >
      <Box
        sx={{
          px: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" sx={{ mb: 1 }}>
          Token Positions
        </Typography>
        <FormControlLabel
          onClick={() => setClosedPositionsToggle(!closedPositionsToggle)}
          control={<Switch size="small" value={closedPositionsToggle} />}
          label="Show closed positions"
        />
      </Box>
      <Box
        sx={{
          py: 1,
          display: "flex",
          flexDirection: "row",
          gap: 1,
          alignItems: "center",
          position: "sticky",
          top: 0,
          background:
            "linear-gradient(to left, rgba(12, 16, 28, 1), rgba(5, 8, 16, 1))",
          "& .MuiTypography-root": {
            // fontWeight: 600
          },
          zIndex: 2,
        }}
      >
        <Box sx={{ width: { xs: "33%", sm: "25%", md: "12.5%" }, pl: 2 }}>
          <Typography>Symbol</Typography>
          <Typography sx={{ display: { xs: "flex", md: "none" } }}>
            Qty
          </Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", md: "12.5%" },
            display: { xs: "none", md: "flex" },
          }}
        >
          <Typography>Qty</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", md: "12.5%" },
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
          }}
        >
          <Typography>Current price</Typography>
          <Typography>Your cost</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", sm: "25%", md: "12.5%" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <Typography>Initial trade date</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", sm: "25%", md: "12.5%" },
            flexDirection: "column",
          }}
        >
          <Typography>P/L Open</Typography>
          <Typography>P/L Open (%)</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", md: "12.5%" },
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
          }}
        >
          <Typography>P/L Day</Typography>
          <Typography>P/L Day (%)</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", md: "12.5%" },
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
          }}
        >
          <Typography>P/L YTD</Typography>
          <Typography>P/L YTD (%)</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: "33%", sm: "25%", md: "12.5%" },
            flexDirection: "column",
            mr: 2,
          }}
        >
          <Typography>Total cost</Typography>
          <Typography>Net liq.</Typography>
        </Box>
      </Box>

      {positions.isLoading
        ? "Loading..."
        : positions.error
        ? "Error loading"
        : positions.data
            .filter(
              (token) =>
                (!closedPositionsToggle && token.tokenAmount > 0) ||
                closedPositionsToggle
            )
            .map((token, i) => {
              const date = dayjs(token.tradeDate * 1000).format("YYYY/MM/DD");
              return (
                <Box
                  key={token.tokenId}
                  sx={{
                    py: 1,
                    background: i % 2 ? "" : theme.palette.background.paper,
                    // userSelect: 'none',
                    "&:hover": {
                      background: theme.palette.background.hover,
                      // cursor: 'pointer'
                    },
                    display: "flex",
                    flexDirection: "row",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{ width: { xs: "33%", sm: "25%", md: "12.5%" }, pl: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Box sx={{ mr: 1 }}>
                        <Avatar
                          src={"icons/tokens/" + token.tokenId + ".svg"}
                          sx={{ width: "24px", height: "24px" }}
                        />
                      </Box>
                      <Box>
                        <Typography sx={{ textOverflow: "ellipsis" }}>
                          {token.tokenName}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography sx={{ display: { xs: "flex", md: "none" } }}>
                      {formatNumber(token.tokenAmount)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", md: "12.5%" },
                      display: { xs: "none", md: "flex" },
                    }}
                  >
                    <Typography>{formatNumber(token.tokenAmount)}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", md: "12.5%" },
                      display: { xs: "none", md: "flex" },
                      flexDirection: "column",
                    }}
                  >
                    <Typography>
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "lastPrice", currency)
                        )}
                    </Typography>
                    <Typography>
                      {/* cost per unit */}
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "costBasis", currency),
                          2
                        )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", sm: "25%", md: "12.5%" },
                      display: { xs: "none", sm: "flex" },
                    }}
                  >
                    {date}
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", sm: "25%", md: "12.5%" },
                      flexDirection: "column",
                    }}
                  >
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlOpen", currency)
                        ),
                      }}
                    >
                      {/* P/L Open */}
                      {getValueByCurrency(token, "pnlOpen", currency) < 0 &&
                        "-"}
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "pnlOpen", currency),
                          2,
                          undefined,
                          true
                        )}
                    </Typography>
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlOpenPct", currency)
                        ),
                      }}
                    >
                      {/* P/L Open (%) */}
                      {`${formatNumber(
                        getValueByCurrency(token, "pnlOpenPct", currency)
                      )}%`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", md: "12.5%" },
                      display: { xs: "none", md: "flex" },
                      flexDirection: "column",
                    }}
                  >
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlDay", currency)
                        ),
                      }}
                    >
                      {/* P/L Day */}
                      {getValueByCurrency(token, "pnlDay", currency) < 0 && "-"}
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "pnlDay", currency),
                          2,
                          undefined,
                          true
                        )}
                    </Typography>
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlDayPct", currency)
                        ),
                      }}
                    >
                      {/* P/L Day (%) */}
                      {`${formatNumber(
                        getValueByCurrency(token, "pnlDayPct", currency)
                      )}%`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", md: "12.5%" },
                      display: { xs: "none", md: "flex" },
                      flexDirection: "column",
                    }}
                  >
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlYear", currency)
                        ),
                      }}
                    >
                      {/* P/L YTD */}
                      {getValueByCurrency(token, "pnlYear", currency) < 0 &&
                        "-"}
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "pnlYear", currency),
                          2,
                          undefined,
                          true
                        )}
                    </Typography>
                    <Typography
                      sx={{
                        color: colorSwitch(
                          getValueByCurrency(token, "pnlYearPct", currency)
                        ),
                      }}
                    >
                      {/* P/L YTD (%) */}
                      {`${formatNumber(
                        getValueByCurrency(token, "pnlYearPct", currency)
                      )}%`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "33%", sm: "25%", md: "12.5%" },
                      flexDirection: "column",
                      mr: 2,
                    }}
                  >
                    <Typography>
                      {/* total cost */}
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "totalCost", currency)
                        )}
                    </Typography>
                    <Typography>
                      {currencySymbol +
                        formatNumber(
                          getValueByCurrency(token, "lastPrice", currency) *
                            token.tokenAmount
                        )}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
    </Paper>
  );
};

export default PositionTable;
