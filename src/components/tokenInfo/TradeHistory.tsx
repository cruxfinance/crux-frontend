import React, { FC, useState, useEffect, useRef, useCallback } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  IconButton,
  Button,
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import Grid from "@mui/system/Unstable_Grid/Grid";
import { formatNumber, getShorterAddress } from "@lib/utils/general";
import { timeFromNow } from "@lib/utils/daytime";
import { currencies, Currencies } from "@lib/utils/currencies";
import Link from "../Link";
import BouncingDotsLoader from "../DotLoader";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { useWallet } from "@contexts/WalletContext";
import { useRouter } from "next/router";

export interface PropsType {
  currency: Currencies;
  tradingPair: string;
  tokenId: string;
  tokenTicker: string;
  exchangeRate: number;
}


const TradeHistory: FC<PropsType> = ({
  currency,
  tradingPair,
  tokenId,
  tokenTicker,
  exchangeRate,
}) => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState<DexOrder[]>([]);
  const [offset, setOffset] = useState(0);
  const [maxId, setMaxId] = useState<number | null>(null);
  const limit = 40;
  const [highlightedItems, setHighlightedItems] = useState<{
    [id: number]: number;
  }>({});
  const [filterAddresses, setFilterAddresses] = useState<string[]>([]);
  const router = useRouter();
  const { sessionData, sessionStatus, setNotSubscribedNotifyDialogOpen } =
    useWallet();
  const isSubscriber =
    sessionData?.user.privilegeLevel === "BASIC" ||
    sessionData?.user.privilegeLevel === "PRO" ||
    sessionData?.user.privilegeLevel === "ADMIN";
  const isLoggedIn = sessionStatus === "authenticated";

  const [view, inView] = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && !loading && !initialLoading) {
      fetchTradeHistory(tokenId, offset, filterAddresses);
    }
  }, [inView]);

  useEffect(() => {
    if (tokenId) {
      reset();
    }
  }, [tokenId]);

  const reset = (newAddresses?: string[]) => {
    setOffset(0); // Reset the offset
    setMaxId(null);
    setTradeHistory([]);
    fetchTradeHistory(tokenId, 0, newAddresses); // Start from the beginning
  };

  const fetchTradeHistory = async (
    tokenId: string,
    currentOffset: number,
    addresses?: string[],
  ) => {
    setLoading(true);
    try {
      const endpoint = `${process.env.CRUX_API}/dex/order_history?token_id=${tokenId}&offset=${currentOffset}&limit=${limit}${addresses && addresses.length > 0 ? `&addresses=${addresses.map((item, i) => (i === addresses.length - 1 ? item : `${item},`))}` : ""}`;
      // console.log('Fetching trade history from endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseText = await response.text();
      const data: DexOrder[] = JSON.parse(responseText);

      setTradeHistory((prevTradeHistory) => [...prevTradeHistory, ...data]);

      if (data.length > 0 && !maxId) {
        const newMaxId = data[0].id;
        setMaxId(newMaxId);
      }
    } catch (error) {
      console.error("Error fetching token data:", error);
    } finally {
      if (initialLoading) setInitialLoading(false);
      setOffset((prevOffset) => prevOffset + limit);
      setLoading(false);
    }
  };

  ////////////////////////////////////
  // START WEBSOCKET STUFF
  ////////////////////////////////////

  const connect = useCallback(() => {
    let socket: WebSocket;
    let pingInterval: NodeJS.Timeout;

    socket = new WebSocket(
      `wss://api.cruxfinance.io/dex/order_history/ws?token_id=${tokenId}&offset=0&limit=25&min_id=${maxId}${filterAddresses.length > 0 ? `&addresses=${filterAddresses.map((item, i) => (i === filterAddresses.length - 1 ? item : `${item},`))}` : ""}`,
    );

    socket.onopen = () => {
      console.log("WebSocket connection established");
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        } else if (
          socket.readyState === WebSocket.CLOSING ||
          socket.readyState === WebSocket.CLOSED
        ) {
          clearInterval(pingInterval);
        }
      }, 10000);
    };

    socket.onmessage = (event) => {
      const message: DexOrder[] = JSON.parse(event.data);
      setTradeHistory((prevTradeHistory) => {
        const existingIds = new Set(prevTradeHistory.map((item) => item.id));
        const newUniqueItems = message.filter(
          (item) => !existingIds.has(item.id),
        );

        if (newUniqueItems.length > 0) {
          const now = Date.now();
          const expirationTime = now + 3000; // 3 seconds from now
          setHighlightedItems((prev) => {
            const newHighlightedItems = { ...prev };
            for (const item of newUniqueItems) {
              newHighlightedItems[item.id] = expirationTime;
            }
            return newHighlightedItems;
          });
          setMaxId(newUniqueItems[0].id);
          setOffset((prevOffset) => prevOffset + newUniqueItems.length);
          console.log(
            "New unique items:",
            newUniqueItems.map((item) => item.id),
          );
          return [...newUniqueItems, ...prevTradeHistory];
        }

        return prevTradeHistory;
      });
      console.log("Received message:", message);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
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

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHighlightedItems((prev) => {
        const newHighlightedItems = { ...prev };
        let changed = false;
        for (const [id, expirationTime] of Object.entries(
          newHighlightedItems,
        )) {
          if (Number(expirationTime) <= now) {
            delete newHighlightedItems[Number(id)];
            changed = true;
          }
        }
        return changed ? newHighlightedItems : prev;
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  ////////////////////////////////////
  // END WEBSOCKET STUFF
  ////////////////////////////////////

  const getPrice = (price: number, decimals?: number) => {
    let displayPrice = price;
    if (currency === "USE") {
      displayPrice = price * exchangeRate;
    }
    return formatNumber(displayPrice, decimals ?? 6, true);
  };

  const removeCurrentForTesting = () => {
    setTradeHistory((prevHistory) => {
      if (prevHistory.length === 0) {
        console.log("Trade history is empty");
        return prevHistory;
      }

      const newHistory = prevHistory.slice(1);

      if (newHistory.length > 0) {
        setMaxId(newHistory[0].id);
      } else {
        setMaxId(null);
      }

      console.log("Removed top item. New top item ID:", newHistory[0]?.id);
      return newHistory;
    });
  };

  const filterByMaker = (maker: string) => {
    if (isSubscriber) {
      if (filterAddresses.length > 0) {
        setFilterAddresses([]);
        reset();
      } else {
        setFilterAddresses([maker]);
        reset([maker]);
      }
    } else {
      setNotSubscribedNotifyDialogOpen(true);
    }
  };

  const handlePremiumClick = () => {
    setNotSubscribedNotifyDialogOpen(true);
  };

  return (
    <>
      {upSm ? (
        <>
          <Box sx={{ py: 1 }}>
            <Grid
              container
              spacing={1}
              alignItems="center"
              sx={{ textAlign: "right", px: 2, mr: "8px" }}
            >
              <Grid xs={2} sx={{ textAlign: "left" }}>
                Type
              </Grid>
              <Grid xs={2}>Total {tradingPair}</Grid>
              <Grid xs={2}>Total {tokenTicker}</Grid>
              <Grid xs={2}>Price ({currency})</Grid>
              <Grid xs={2}>Age</Grid>
              <Grid xs={2} sx={{ textAlign: "right" }}>
                Maker
              </Grid>
            </Grid>
          </Box>
          <Box
            sx={{
              mb: 2,
              maxHeight: "75vh",
              overflowY: "scroll",
              overflowX: "hidden",
            }}
          >
            {!initialLoading &&
              tradeHistory.map((item, i) => {
                const itemColor = item.order_type.includes("Buy")
                  ? theme.palette.up.main
                  : theme.palette.down.main;
                return (
                  <Box
                    key={`${item.id}-${i}`}
                    sx={{
                      py: 1,
                      transition: "all 0.5s ease-in-out",
                      "@keyframes highlightGlow": {
                        "0%": {
                          transform: "scale(0.95)",
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                        },
                        "50%": {
                          transform: "scale(1)",
                          background: "rgba(255,255,255,0.3)",
                        },
                        "100%": {
                          transform: "scale(1)",
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                        },
                      },
                      animation:
                        highlightedItems[item.id] &&
                        highlightedItems[item.id] > Date.now()
                          ? "highlightGlow 2s ease-in-out"
                          : "none",
                      background: i % 2 ? "" : theme.palette.background.paper,
                      "&:hover": {
                        background: theme.palette.background.hover,
                      },
                    }}
                  >
                    <Grid
                      container
                      spacing={1}
                      alignItems="center"
                      sx={{ textAlign: "right", px: 2 }}
                    >
                      <Grid xs={2}>
                        <Typography
                          sx={{ color: itemColor, textAlign: "left" }}
                        >
                          {item.order_type}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Typography sx={{ color: itemColor }}>
                          {formatNumber(
                            Number(item.total_filled_base_amount),
                            4,
                          )}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Typography sx={{ color: itemColor }}>
                          {formatNumber(
                            Number(item.total_filled_quote_amount),
                            2,
                            true,
                          )}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Typography sx={{ color: itemColor }}>
                          {currencies[currency]}
                          {getPrice(item.price)}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Typography sx={{ color: itemColor }}>
                          {timeFromNow(new Date(item.chain_time))}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            "& .default-text, & .hover-text": {
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              width: "100%",
                            },
                            "& .default-text": {
                              display: "flex",
                            },
                            "& .hover-text": {
                              display: "none",
                            },
                            ...(!isSubscriber && {
                              "&:hover": {
                                color: theme.palette.getContrastText("#7bd1be"),
                                background: "#7bd1be!important",
                                borderRadius: "6px",
                                borderColor: "#7bd1be!important",
                                "& .default-text": {
                                  display: "none",
                                },
                                "& .hover-text": {
                                  display: "flex",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                },
                              },
                            }),
                          }}
                        >
                          <span className="default-text">
                            <Typography sx={{ color: itemColor }}>
                              <Link
                                href={`https://explorer.ergoplatform.com/en/addresses/${item.maker_address}`}
                                sx={{
                                  color: "#7bd1be",
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                {getShorterAddress(item.maker_address)}
                              </Link>
                            </Typography>
                            <Button
                              variant="outlined"
                              color="inherit"
                              onClick={() => filterByMaker(item.maker_address)}
                              sx={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "3px",
                                background: theme.palette.background.paper,
                                border: `1px solid #3B5959`,
                                ml: 1,
                                minWidth: "0!important",
                                p: 0,
                              }}
                            >
                              {filterAddresses.length > 0 ? (
                                <CloseIcon
                                  sx={{
                                    width: "20px",
                                    height: "20px",
                                    color: "#7bd1be",
                                  }}
                                />
                              ) : (
                                <FilterListIcon
                                  sx={{
                                    width: "20px",
                                    height: "20px",
                                    color: "#7bd1be",
                                  }}
                                />
                              )}
                            </Button>
                          </span>
                          <Box
                            component="span"
                            className="hover-text"
                            onClick={handlePremiumClick}
                          >
                            Get premium
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            <Box ref={view} sx={{ minHeight: "24px" }}>
              {loading && <BouncingDotsLoader />}
            </Box>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ py: 1 }}>
            <Grid
              container
              spacing={1}
              alignItems="center"
              columns={9}
              sx={{ textAlign: "right", px: 2, mr: "8px" }}
            >
              <Grid xs={2} sx={{ textAlign: "left" }}>
                <Typography>Type</Typography>
                <Typography>Age</Typography>
              </Grid>
              <Grid xs={3} sx={{ textAlign: "left" }}>
                Price ({currencies[currency]})
              </Grid>
              <Grid xs={2} sx={{ textAlign: "left" }}>
                <Typography>
                  Amt {capitalizeFirstLetter(tradingPair)}
                </Typography>
                <Typography>Amt {tokenTicker.slice(0, 3)}</Typography>
              </Grid>
              <Grid xs={2} sx={{ textAlign: "right" }}>
                Maker
              </Grid>
            </Grid>
          </Box>
          <Box
            sx={{ mb: 2, flex: 1, overflowY: "scroll", overflowX: "hidden" }}
          >
            {!initialLoading &&
              tradeHistory.map((item, i) => {
                const itemColor = item.order_type.includes("Buy")
                  ? theme.palette.up.main
                  : theme.palette.down.main;
                return (
                  <Box
                    key={item.id}
                    sx={{
                      py: 1,
                      transition: "all 0.5s ease-in-out",
                      "@keyframes highlightGlow": {
                        "0%": {
                          transform: "scale(0.95)",
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                        },
                        "50%": {
                          transform: "scale(1)",
                          background: "rgba(255,255,255,0.3)",
                        },
                        "100%": {
                          transform: "scale(1)",
                          background:
                            i % 2 ? "" : theme.palette.background.paper,
                        },
                      },
                      animation:
                        highlightedItems[item.id] &&
                        highlightedItems[item.id] > Date.now()
                          ? "highlightGlow 2s ease-in-out"
                          : "none",
                      background: i % 2 ? "" : theme.palette.background.paper,
                      "&:hover": {
                        background: theme.palette.background.hover,
                      },
                    }}
                  >
                    <Grid
                      container
                      spacing={1}
                      alignItems="center"
                      columns={9}
                      sx={{ textAlign: "right", px: 2 }}
                    >
                      <Grid xs={2}>
                        <Typography
                          sx={{ color: itemColor, textAlign: "left" }}
                        >
                          {item.order_type}
                        </Typography>
                        <Typography
                          sx={{ color: itemColor, textAlign: "left" }}
                        >
                          {timeFromNow(new Date(item.chain_time))}
                        </Typography>
                      </Grid>
                      <Grid xs={3} sx={{ textAlign: "left" }}>
                        <Typography sx={{ color: itemColor }}>
                          {currencies[currency]}
                          {getPrice(item.price, 4)}
                        </Typography>
                      </Grid>
                      <Grid xs={2} sx={{ textAlign: "left" }}>
                        <Typography sx={{ color: itemColor }}>
                          {formatNumber(
                            Number(item.order_base_amount),
                            2,
                            true,
                          )}
                        </Typography>
                        <Typography sx={{ color: itemColor }}>
                          {formatNumber(
                            Number(item.filled_quote_amount),
                            2,
                            true,
                          )}
                        </Typography>
                      </Grid>
                      <Grid xs={2}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Typography sx={{ color: itemColor }}>
                            <Link
                              href={`https://explorer.ergoplatform.com/en/addresses/${item.maker_address}`}
                              sx={{
                                color: "#7bd1be",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              {item.maker_address.slice(0, 3)}
                            </Link>
                          </Typography>
                          <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => filterByMaker(item.maker_address)}
                            sx={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "3px",
                              background: theme.palette.background.paper,
                              border: `1px solid #3B5959`,
                              ml: 1,
                              minWidth: "0!important",
                              p: 0,
                            }}
                          >
                            {filterAddresses.length > 0 ? (
                              <CloseIcon
                                sx={{
                                  width: "20px",
                                  height: "20px",
                                  color: "#7bd1be",
                                }}
                              />
                            ) : (
                              <FilterListIcon
                                sx={{
                                  width: "20px",
                                  height: "20px",
                                  color: "#7bd1be",
                                }}
                              />
                            )}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            <Box ref={view} sx={{ minHeight: "24px" }}>
              {loading && <BouncingDotsLoader />}
            </Box>
          </Box>
        </>
      )}
      {/* <Button onClick={removeCurrentForTesting}>
        Dev
      </Button> */}
    </>
  );
};

export default TradeHistory;

const capitalizeFirstLetter = (string: string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};
