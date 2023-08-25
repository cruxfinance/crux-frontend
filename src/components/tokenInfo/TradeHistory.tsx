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
import BouncingDotsLoader from "../DotLoader";

export interface ITrade {
  time: number;
  action_type: 'Buy' | 'Sell' | 'Liquidity Removal' | 'Liquidity Provision';
  price_in_ergo: number;
  ergo_price: number;
  action_amount: string;
  user_address: string;
}

export interface PropsType {
  currency: Currencies;
  tradingPair: string;
  tokenId: string;
  tokenTicker: string;
}

const TradeHistory: FC<PropsType> = ({ currency, tradingPair, tokenId, tokenTicker }) => {
  const theme = useTheme();
  // const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [tradeHistory, setTradeHistory] = useState<ITrade[]>([])

  const [view, inView] = useInView({
    threshold: 0,
  });

  const [offset, setOffset] = useState(0);
  const limit = 40;

  useEffect(() => {
    if (inView && !loading && initialLoading === false) {
      console.log('reload')
      fetchTradeHistory(tokenId, offset);
    }
  }, [inView]);

  async function fetchTradeHistory(tokenId: string, currentOffset: number) {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/spectrum/actions`;
      const payload = {
        limit: limit,
        offset: currentOffset,
        quote_id: tokenId
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setTradeHistory(prevTradeHistory => [...prevTradeHistory, ...data]);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      if (initialLoading === true) setInitialLoading(false)
      setOffset(prevOffset => prevOffset + limit);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenId !== undefined) {
      setOffset(0); // Reset the offset
      fetchTradeHistory(tokenId, 0); // Start from the beginning
    }
  }, [tokenId]);

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
      <Box sx={{ mb: 2 }}>
        {!initialLoading && tradeHistory.map((item, i) => {
          const itemColor =
            item.action_type === 'Buy'
              ? theme.palette.up.main
              : item.action_type === 'Sell'
                ? theme.palette.down.main
                : '#9475d8'
          return (
            <Box key={i + item.time.toString()}
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
                    {item.action_type.includes('Removal')
                      ? 'Remove'
                      : item.action_type.includes('Provision')
                        ? 'Add'
                        : item.action_type
                    }
                  </Typography>
                </Grid>
                <Grid xs={2}>
                  <Typography sx={{ color: itemColor }}>
                    {currencies[currency]}{currency === 'USD' ? formatNumber(item.price_in_ergo * item.ergo_price, 4) : formatNumber(item.price_in_ergo, 4)}
                  </Typography>
                </Grid>
                <Grid xs={2}>
                  <Typography sx={{ color: itemColor }}>
                    {item.action_type.includes('Liquidity')
                      ? formatNumber(Math.abs(Number(item.action_amount.split(', ')[1])), 2, true)
                      : formatNumber(Math.abs(Number(item.action_amount)), 2, true)}
                  </Typography>
                </Grid>
                <Grid xs={2}>
                  <Typography sx={{ color: itemColor }}>
                    {currencies[currency]}{currency === 'USD'
                      ? formatNumber(Math.abs(Number(
                        item.action_type.includes('Liquidity') ? item.action_amount.split(', ')[1] : item.action_amount
                      )) * item.price_in_ergo * item.ergo_price, 2, true)
                      : formatNumber(Math.abs(Number(
                        item.action_type.includes('Liquidity') ? item.action_amount.split(', ')[1] : item.action_amount
                      )) * item.price_in_ergo, 2, true)}
                  </Typography>
                </Grid>
                <Grid xs={2}>
                  <Typography sx={{ color: itemColor }}>
                    {timeFromNow(new Date(item.time * 1000))}
                  </Typography>
                </Grid>
                <Grid xs={3}>
                  <Typography sx={{ color: itemColor }}>
                    <Link
                      href={`https://explorer.ergoplatform.com/en/addresses/${item.user_address}`}
                      sx={{
                        color: '#7bd1be',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {getShorterAddress(item.user_address)}
                    </Link>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )
        })}
      </Box>
      <div ref={view}></div>
      {loading && <BouncingDotsLoader />}
    </>
  );
};

export default TradeHistory;


