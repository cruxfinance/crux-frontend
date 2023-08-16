import React, { FC, useState, useEffect } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  Paper,
  Slide,
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import Grid from "@mui/system/Unstable_Grid/Grid";
import Image from "next/image";
import { useRouter } from "next/router";
import { formatNumber, getShorterAddress } from "@src/utils/general";
import { timeFromNow } from "@src/utils/daytime";
import { currencies, Currencies } from "@src/utils/currencies";
import Link from "../Link";

export interface ITrade {
  timestamp: Date;
  type: string;
  price: number;
  totalToken: number;
  totalExchange: number;
  wallet: string;
}

export interface PropsType {
  currency: Currencies;
  tradingPair: string;
  tokenId: string;
  tokenTicker: string;
}

const TradeHistory: FC<PropsType> = ({ currency, tradingPair, tokenId, tokenTicker }) => {
  const theme = useTheme();
  const router = useRouter()
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const [loading, setLoading] = useState(false)
  const [tradeHistory, setTradeHistory] = useState<ITrade[]>([])

  async function fetchTradeHistory(tokenId: string) {
    setLoading(true)
    try {
      const query = `/api/mocks/trade-history/${tokenId}?limit=25&offset=0&currency=${currency}${tradingPair ? `&tradingPair=${tradingPair}` : ''}`
      const response = await fetch(query);
      const data = await response.json();
      console.log(query)
      setTradeHistory(data);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchTradeHistory(tokenId)
  }, [tokenId, currency])

  return (
    <>
      <Box sx={{
        py: 1,
      }}
      >
        <Grid container spacing={1} alignItems="center" sx={{ textAlign: 'right', px: 2 }}>
          <Grid xs={1} sx={{ textAlign: 'left' }}>
            Type
          </Grid>
          <Grid xs={2}>
            Price ({currency})
          </Grid>
          <Grid xs={2}>
            Total ({tokenTicker})
          </Grid>
          <Grid xs={2}>
            Value
          </Grid>
          <Grid xs={2}>
            Age
          </Grid>
          <Grid xs={3}>
            Maker
          </Grid>
        </Grid>
      </Box>
      {tradeHistory.map((item, i) => {
        const itemColor =
          item.type === 'Buy'
            ? theme.palette.up.main
            : item.type === 'Sell'
              ? theme.palette.down.main
              : '#9475d8'
        return (
          <Box key={i + item.timestamp.toString()}
            sx={{
              py: 1,
              background: i % 2 ? '' : theme.palette.background.paper,
              // userSelect: 'none',
              '&:hover': {
                background: theme.palette.background.hover,
                // cursor: 'pointer'
              }
            }}
            onClick={(e) => {
              // e.preventDefault()
              // router.push(`/tokens/${item.tokenId}`)
            }}
          >
            <Grid container spacing={1} alignItems="center" sx={{ textAlign: 'right', px: 2 }}>
              <Grid xs={1}>
                <Typography sx={{ color: itemColor, textAlign: 'left' }}>
                  {item.type}
                </Typography>
              </Grid>
              <Grid xs={2}>
                <Typography sx={{ color: itemColor }}>
                  {item.price && currencies[currency] + formatNumber(item.price, 4)}
                </Typography>
              </Grid>
              <Grid xs={2}>
                <Typography sx={{ color: itemColor }}>
                  {formatNumber(item.totalToken, 2, true)}
                </Typography>
              </Grid>
              <Grid xs={2}>
                <Typography sx={{ color: itemColor }}>
                  {item.price && currencies[currency] + formatNumber(item.totalToken * item.price, 2, true)}
                </Typography>
              </Grid>
              <Grid xs={2}>
                <Typography sx={{ color: itemColor }}>
                  {timeFromNow(new Date(item.timestamp))}
                </Typography>
              </Grid>
              <Grid xs={3}>
                <Typography sx={{ color: itemColor }}>
                  <Link
                    href={`https://explorer.ergoplatform.com/en/addresses/${item.wallet}`}
                    sx={{
                      color: '#7bd1be',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {getShorterAddress(item.wallet)}
                  </Link>
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )
      })}
    </>
  );
};

export default TradeHistory;
