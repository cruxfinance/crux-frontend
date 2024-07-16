import React, { FC, useState, useEffect, useRef, useCallback } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  IconButton,
  Button
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { formatNumber, getShorterAddress } from "@lib/utils/general";
import { timeFromNow } from "@lib/utils/daytime";
import { currencies, Currencies } from "@lib/utils/currencies";
import Link from "../Link";
import BouncingDotsLoader from "../DotLoader";
import FilterListIcon from '@mui/icons-material/FilterList';

export interface PropsType {
  currency: Currencies;
  tradingPair: string;
  tokenId: string;
  tokenTicker: string;
  exchangeRate: number;
}

interface DexOrder {
  "id": number;
  "transaction_id": string;
  "quote_name": string;
  "base_name": string;
  "order_quote_amount": string;
  "order_base_amount": string;
  "filled_quote_amount": string;
  "filled_base_amount": string;
  "total_filled_quote_amount": string;
  "total_filled_base_amount": string;
  "exchange": number;
  "order_type": string;
  "status": string;
  "maker_address": string;
  "taker_address": string;
  "chain_time": number
}

const TradeHistory: FC<PropsType> = ({ currency, tradingPair, tokenId, tokenTicker, exchangeRate }) => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState<DexOrder[]>([]);
  const [offset, setOffset] = useState(0);
  const [maxId, setMaxId] = useState<number | null>(null);
  const limit = 40;
  const [highlightedItems, setHighlightedItems] = useState<number[]>([]);

  const [view, inView] = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && !loading && !initialLoading) {
      fetchTradeHistory(tokenId, offset);
    }
  }, [inView]);

  useEffect(() => {
    if (tokenId) {
      setOffset(0); // Reset the offset
      fetchTradeHistory(tokenId, 0); // Start from the beginning
    }
  }, [tokenId]);

  const fetchTradeHistory = async (tokenId: string, currentOffset: number) => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/dex/order_history?token_id=${tokenId}&offset=${currentOffset}&limit=${limit}`;
      // console.log('Fetching trade history from endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseText = await response.text();
      const data: DexOrder[] = JSON.parse(responseText);

      setTradeHistory((prevTradeHistory) => [...prevTradeHistory, ...data]);

      if (data.length > 0 && !maxId) {
        const newMaxId = data[0].id;
        setMaxId(newMaxId);
      }
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      if (initialLoading) setInitialLoading(false);
      setOffset((prevOffset) => prevOffset + limit);
      setLoading(false);
    }
  }

  ////////////////////////////////////
  // START WEBSOCKET STUFF
  ////////////////////////////////////
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    let socket: WebSocket;
    let pingInterval: NodeJS.Timeout;

    socket = new WebSocket(`wss://api.cruxfinance.io/dex/order_history/ws?token_id=${tokenId}&offset=0&limit=25&min_id=${maxId}`);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        } else if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
          clearInterval(pingInterval);
        }
      }, 10000);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setTradeHistory((prevTradeHistory) => [...message, ...prevTradeHistory]);
      setMaxId(message[0].id)
      const newItemIds = message.map((item: DexOrder) => item.id);
      setHighlightedItems(newItemIds);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setHighlightedItems([]);
      }, 20000);

      console.log(message);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      clearInterval(pingInterval);
      setTimeout(connect, 5000);
    };

    return () => {
      if (socket) {
        socket.close();
      }
      clearInterval(pingInterval);
    };
  }, [maxId, tokenId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (maxId) {
      cleanup = connect();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [maxId, connect]);

  ////////////////////////////////////
  // END WEBSOCKET STUFF
  ////////////////////////////////////

  const getPrice = (baseAmount: string | number, quoteAmount: string | number) => {
    var price = Number(baseAmount) / Number(quoteAmount)

    if (currency === "USD") {
      price = price * exchangeRate
    }

    return formatNumber(price, 6, true)
  }

  const removeCurrentForTesting = () => {

  }

  return (
    <>
      {upSm ? (
        <>
          <Box sx={{ py: 1 }}>
            <Grid container spacing={1} alignItems="center" sx={{ textAlign: 'right', px: 2, mr: '8px' }}>
              <Grid xs={2} sx={{ textAlign: 'left' }}>
                Type
              </Grid>
              <Grid xs={2} sx={{ textAlign: 'left' }}>
                Total {tradingPair}
              </Grid>
              <Grid xs={2}>
                Total {tokenTicker}
              </Grid>
              <Grid xs={2}>
                Price ({currency})
              </Grid>
              <Grid xs={2}>
                Age
              </Grid>
              <Grid xs={2} sx={{ textAlign: 'right' }}>
                Maker
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ mb: 2, maxHeight: '75vh', overflowY: 'scroll', overflowX: 'hidden' }}>
            {!initialLoading && tradeHistory.map((item, i) => {
              const itemColor = item.order_type.includes('Buy') ? theme.palette.up.main : theme.palette.down.main;
              return (
                <Box key={`${item.id}-${i}`}
                  sx={{
                    py: 1,
                    background: i % 2 ? '' : theme.palette.background.paper,
                    '&:hover': {
                      background: theme.palette.background.hover,
                    }
                  }}
                >
                  <Grid container spacing={1} alignItems="center" sx={{ textAlign: 'right', px: 2 }}>
                    <Grid xs={2}>
                      <Typography sx={{ color: itemColor, textAlign: 'left' }}>
                        {item.order_type}
                      </Typography>
                    </Grid>
                    <Grid xs={2} sx={{ textAlign: 'left' }}>
                      <Typography sx={{ color: itemColor }}>
                        {formatNumber(Number(item.total_filled_base_amount), 4)}
                      </Typography>
                    </Grid>
                    <Grid xs={2}>
                      <Typography sx={{ color: itemColor }}>
                        {formatNumber(Number(item.total_filled_quote_amount), 2, true)}
                      </Typography>
                    </Grid>
                    <Grid xs={2}>
                      <Typography sx={{ color: itemColor }}>
                        {currencies[currency]}{getPrice(item.total_filled_base_amount, item.filled_quote_amount)}
                      </Typography>
                    </Grid>
                    <Grid xs={2}>
                      <Typography sx={{ color: itemColor }}>
                        {timeFromNow(new Date(item.chain_time))}
                      </Typography>
                    </Grid>
                    <Grid xs={2}>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography sx={{ color: itemColor }}>
                          <Link
                            href={`https://explorer.ergoplatform.com/en/addresses/${item.maker_address}`}
                            sx={{
                              color: '#7bd1be',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {getShorterAddress(item.maker_address)}
                          </Link>
                        </Typography>
                        <Button
                          variant="outlined"
                          color="inherit"
                          sx={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '3px',
                            background: theme.palette.background.paper,
                            border: `1px solid #3B5959`,
                            ml: 1,
                            minWidth: '0!important',
                            p: 0
                          }}
                        >
                          <FilterListIcon
                            sx={{
                              width: '20px',
                              height: '20px',
                              color: "#7bd1be"
                            }}
                          />
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
            <Box ref={view} sx={{ minHeight: '24px' }}>
              {loading && <BouncingDotsLoader />}
            </Box>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ py: 1 }}>
            <Grid container spacing={1} alignItems="center" columns={9} sx={{ textAlign: 'right', px: 2, mr: '8px' }}>
              <Grid xs={2} sx={{ textAlign: 'left' }}>
                <Typography>Type</Typography>
                <Typography>Age</Typography>
              </Grid>
              <Grid xs={3} sx={{ textAlign: 'left' }}>
                Price ({currency})
              </Grid>
              <Grid xs={2} sx={{ textAlign: 'left' }}>
                <Typography>Total {tradingPair}</Typography>
                <Typography>Total {tokenTicker}</Typography>
              </Grid>
              <Grid xs={2} sx={{ textAlign: 'right' }}>
                Maker
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ mb: 2, maxHeight: '75vh', overflowY: 'scroll', overflowX: 'hidden' }}>
            {!initialLoading && tradeHistory.map((item, i) => {
              const itemColor = item.order_type.includes('Buy') ? theme.palette.up.main : theme.palette.down.main;
              return (
                <Box key={item.id}
                  sx={{
                    py: 1,
                    background: highlightedItems.includes(item.id)
                      ? 'rgba(255,255,255,0.5)'
                      : i % 2 ? '' : theme.palette.background.paper,
                    transition: 'background-color 0.5s ease',
                    '&:hover': {
                      background: theme.palette.background.hover,
                    }
                  }}
                >
                  <Grid container spacing={1} alignItems="center" columns={9} sx={{ textAlign: 'right', px: 2 }}>
                    <Grid xs={2}>
                      <Typography sx={{ color: itemColor, textAlign: 'left' }}>
                        {item.order_type}
                      </Typography>
                      <Typography sx={{ color: itemColor }}>
                        {timeFromNow(new Date(item.chain_time))}
                      </Typography>
                    </Grid>
                    <Grid xs={3} sx={{ textAlign: 'left' }}>
                      <Typography sx={{ color: itemColor }}>
                        {currencies[currency]}{getPrice(item.total_filled_base_amount, item.filled_quote_amount)}
                      </Typography>
                    </Grid>
                    <Grid xs={2} sx={{ textAlign: 'left' }}>
                      <Typography sx={{ color: itemColor }}>
                        {formatNumber(Number(item.order_base_amount), 2, true)}
                      </Typography>
                      <Typography sx={{ color: itemColor }}>
                        {currencies[currency]}{formatNumber(Number(item.filled_quote_amount), 2, true)}
                      </Typography>
                    </Grid>
                    <Grid xs={2}>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography sx={{ color: itemColor }}>
                          <Link
                            href={`https://explorer.ergoplatform.com/en/addresses/${item.maker_address}`}
                            sx={{
                              color: '#7bd1be',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {getShorterAddress(item.maker_address)}
                          </Link>
                        </Typography>
                        <Button
                          variant="outlined"
                          color="inherit"
                          sx={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '3px',
                            background: theme.palette.background.paper,
                            border: `1px solid #3B5959`,
                            ml: 1,
                            minWidth: '0!important',
                            p: 0
                          }}
                        >
                          <FilterListIcon
                            sx={{
                              width: '20px',
                              height: '20px',
                              color: "#7bd1be"
                            }}
                          />
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
            <Box ref={view} sx={{ minHeight: '24px' }}>
              {loading && <BouncingDotsLoader />}
            </Box>
          </Box>
        </>
      )}
    </>
  );
};

export default TradeHistory;
