import React, { FC, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  List,
  ListItem,
  Container,
  Paper,
  Divider,
  CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
  TextField,
  FilledInput
} from '@mui/material';
import Grid from '@mui/system/Unstable_Grid/Grid';
import Balance from '@components/portfolio/Balance';
import { IPieToken } from '@components/charts/PieChart';
import TokenSummary from '@components/portfolio/TokenSummary';
import NftList from '@components/portfolio/NftList';
import { tokenListInfo } from '@utils/assetsNew';
import { INftItem } from '@components/portfolio/NftList';
import ValueLocked from '@components/portfolio/ValueLocked';
import { Currencies } from '@utils/currencies';
import XyChart from '@src/components/charts/XyChart';
import { adjustDecimals } from '@src/utils/general';
import { IBalance } from '@components/portfolio/Balance';

export interface IExtendedToken extends IPieToken {
  tokenId: string;
  decimals: number;
  pctChange?: number; // expressed with 2 decimals. 100 = 1.00%
  tokenType?: string;
}

export interface IReducedToken extends IPieToken {
  tokenId: string;
  pctChange?: number;
}

interface IPortfolioToken {
  token_amount: number;
  wrapped_tokens: [];
  token_id: string;
  token_name: string;
  token_description: string;
  decimals: number;
  minted: number;
  value_in_erg: number;
}

const Portfolio = () => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  const [boxHeight, setBoxHeight] = useState('auto');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    tokenSummary: true
  })
  const [areaChart, setAreaChart] = useState(true)
  const [currency, setCurrency] = useState<Currencies>('USD')
  const [filteredNfts, setFilteredNfts] = useState<INftItem[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [sortedFilteredTokensList, setSortedFilteredTokensList] = useState<IReducedToken[]>([])
  // const [tokenList, setTokenList] = useState<IPortfolioToken[]>([])
  const [addressList, setAddressList] = useState<string[]>([])
  const [balanceProps, setBalanceProps] = useState<IBalance>({
    balance: 0,
    currency: 'USD',
    tvl: 0,
    apy: 0,
    pctChange: 0
  })

  async function fetchTokenData(): Promise<IPortfolioToken[]> {
    try {
      setLoading(
        prev => {
          return {
            ...prev,
            fetchPortfolio: true
          }
        }
      );
      console.log('fetch')
      const endpoint = `${process.env.CRUX_API}/crux/portfolio`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({ "addresses": addressList })
      });

      const data: IPortfolioToken[] = await response.json();
      console.log(data);
      // setTokenList(data)
      // setInitialLoading(false)
      setLoading(
        prev => {
          return {
            ...prev,
            fetchPortfolio: false
          }
        }
      );
      return data
    } catch (error) {
      console.error('Error fetching token data:', error);
      setLoading(
        prev => {
          return {
            ...prev,
            fetchPortfolio: false
          }
        }
      );
      return []
    }
  }

  async function fetchData() {
    const data = await fetchTokenData()

    // remove NFTs & tokens with no dex value
    const mainList = data.filter((item) => item.value_in_erg > 0).map((item, i) => {
      return item
    })

    // do this to make the value of each token have the correct number of decimals
    const transformAmounts: IReducedToken[] = mainList.map(({ decimals, ...item }) => {
      const newItem = {
        name: item.token_name,
        amount: adjustDecimals(item.token_amount, decimals),
        value: item.value_in_erg, // UPDATE: currency
        tokenId: item.token_id
      }
      return newItem
    })

    // get the value of the entire portfolio
    const totalTokensValue = transformAmounts.reduce((acc, token) => acc + token.amount * token.value, 0);
    setTotalValue(totalTokensValue)

    setBalanceProps({
      balance: totalTokensValue,
      currency: currency,
      tvl: 150.23,
      apy: 42.3,
      pctChange: 1.2
    })

    // sort tokens by decending value
    const sortedTokens = transformAmounts.sort((a, b) =>
      b.amount * b.value - a.amount * a.value
    )
    setSortedFilteredTokensList(sortedTokens)

    // filter NFTs out for their processing
    const list = data.filter((item) => item.minted === 1).map((item, i) => {
      return {
        name: item.token_name,
        link: '/tokens/' + item.token_id,
        tokenId: item.token_id,
        qty: item.decimals !== 0 ? item.token_amount / Math.pow(10, item.decimals) : item.token_amount,
        loading: true
      }
    })
    setFilteredNfts(list)

    async function fetchDataChunk(chunk: any) {
      const additionalData = await tokenListInfo(chunk);
      setFilteredNfts(prevState => {
        const newList = prevState.map(item => {
          const apiItem = additionalData.find(apiItem => apiItem.tokenId === item.tokenId);
          return apiItem ? { ...item, ...apiItem } : item;
        });
        return newList;
      })
    }

    // get NFT info in smaller chunks
    const chunks = chunkArray(list, 8);
    for (const chunk of chunks) {
      await fetchDataChunk(chunk);
    }
  }

  useEffect(() => {
    fetchData();
  }, [])

  const isLoading = Object.values(loading).some(value => value === true)

  const handleChangeAddressList = (event: React.ChangeEvent<HTMLInputElement>) => {
    const addresses = event.target.value.split(",").map(address => address.trim());
    setAddressList(addresses);
    console.log(addresses)
  }

  return (
    <Container>
      <Grid container sx={{ mb: 2 }} spacing={2} alignItems="center">
        <Grid xs>
          <FilledInput
            value={addressList.join(", ")}
            onChange={handleChangeAddressList}
            fullWidth
            placeholder="Any number of wallet addresses, separated by commas"
          />
        </Grid>
        <Grid xs="auto">
          <Button variant="contained" onClick={() => fetchData()}>
            Submit
          </Button>
        </Grid>
      </Grid>


      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          opacity: isLoading ? '1' : '0',
          width: '100vw',
          height: '100vh',
          background: 'rgba(24,28,33,1)',
          zIndex: 999,
          color: '#fff',
          transition: 'opacity 500ms',
          pointerEvents: isLoading ? 'auto' : 'none'
        }}
      >
        <CircularProgress color="inherit" sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }} />
      </Box>
      <Grid container alignItems="stretch" spacing={3}>
        <Grid xs={12} lg={9}>
          <Paper sx={{ p: 3, width: '100%' }}>
            <Grid container spacing={4} direction={{ xs: 'column', md: 'row' }}>
              <Grid xs={12} md={4} >
                <Balance {...balanceProps} />
                {/* <Button onClick={() => setCurrency(currency === 'USD' ? 'ERG' : 'USD')}>
                  Currency
                </Button> */}
              </Grid>
              <Grid xs={12} md={8} container direction={{ xs: 'column', md: 'row' }}>
                <Grid>{upMd ? <Divider orientation="vertical" /> : <Divider />}</Grid>
                <Grid xs>
                  <TokenSummary
                    totalValue={totalValue}
                    tokenList={sortedFilteredTokensList}
                    currency="USD"
                    boxHeight={boxHeight}
                    setBoxHeight={setBoxHeight}
                    setLoading={setLoading}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid xs={12} sm={6} lg={3}>
          <Paper sx={{ p: 3, width: '100%', height: '100%' }}>
            <NftList tokenList={filteredNfts} boxHeight={boxHeight} setBoxHeight={setBoxHeight} />
          </Paper>
        </Grid>
        <Grid xs={12} sm={6} lg={3} sx={{ position: 'relative', zIndex: 10 }}>
          <Paper sx={{ p: 3, width: '100%', height: '100%' }}>
            <ValueLocked currency={currency} />
          </Paper>
        </Grid>
        <Grid xs={12} lg={9}>
          <Paper sx={{ py: 3, px: upSm ? 3 : 0, width: '100%', height: '100%' }}>
            <Box sx={{ px: upSm ? 0 : 3 }}>
              <Button variant="contained" onClick={() => setAreaChart(!areaChart)}>Stacked chart</Button>
            </Box>
            <Box sx={{ height: '600px', width: upSm ? '100%' : '100vw', ml: upSm ? 0 : -1, position: 'relative' }}>
              <XyChart
                height={600}
                tokenList={sortedFilteredTokensList}
                areaChart={areaChart} // false for line chart
                totalValue={totalValue}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container >
  );
};

export default Portfolio;

const chunkArray = (array: any[], chunkSize: number) => {
  return Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, index) => {
    const start = index * chunkSize;
    const end = start + chunkSize;
    return array.slice(start, end);
  });
}