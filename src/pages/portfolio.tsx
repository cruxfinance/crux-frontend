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
  Button
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
import XyChart from '@components/charts/xyChart/XyChart';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { adjustDecimals } from '@src/utils/general';

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

const Portfolio = () => {
  const [boxHeight, setBoxHeight] = useState('auto');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    tokenSummary: true
  })
  const [areaChart, setAreaChart] = useState(true)
  const [currency, setCurrency] = useState<Currencies>('USD')
  const [filteredNfts, setFilteredNfts] = useState<INftItem[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [sortedFilteredTokensList, setSortedFilteredTokensList] = useState<IReducedToken[]>([])

  useEffect(() => {
    const list = tokenList.filter((item) => item.amount === 1 && item.decimals === 0).map((item, i) => {
      return {
        name: item.name!,
        link: '/marketplace/token/' + item.tokenId,
        tokenId: item.tokenId,
        qty: item.decimals !== 0 ? item.amount / Math.pow(10, item.decimals) : item.amount,
        loading: true
      }
    })
    setFilteredNfts(list)

    async function fetchData() {
      const chunks = chunkArray(list, 8);
      for (const chunk of chunks) {
        await fetchDataChunk(chunk);
      }
    }

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

    fetchData();
  }, [])

  useEffect(() => {
    // remove NFTs & tokens with no dex value
    const list = tokenList.filter((item) => item.value > 0).map((item, i) => {
      return item
    })

    // do this to make the value of each token have the correct number of decimals
    const transformAmounts: IReducedToken[] = list.map(({ decimals, ...item }) => {
      const newItem = {
        ...item,
        amount: adjustDecimals(item.amount, decimals)
      }
      return newItem
    })

    // get the value of the entire portfolio
    const totalTokensValue = transformAmounts.reduce((acc, token) => acc + token.amount * token.value, 0);
    setTotalValue(totalTokensValue)

    // sort tokens by decending value
    const sortedTokens = transformAmounts.sort((a, b) =>
      b.amount * b.value - a.amount * a.value
    )
    setSortedFilteredTokensList(sortedTokens)
  }, [])

  const isLoading = Object.values(loading).some(value => value === true)

  return (
    <Container>
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
        <Grid xs={12} md={9}>
          <Paper sx={{ p: 3, width: '100%' }}>
            <Grid container spacing={4}>
              <Grid xs={12} sm={4} >
                <Balance />
                {/* <Button onClick={() => setCurrency(currency === 'USD' ? 'ERG' : 'USD')}>
                  Currency
                </Button> */}
              </Grid>
              <Grid xs={12} sm={8} container>
                <Grid><Divider orientation="vertical" /></Grid>
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
        <Grid xs={12} md={3}>
          <Paper sx={{ p: 3, width: '100%', height: '100%' }}>
            <NftList tokenList={filteredNfts} boxHeight={boxHeight} setBoxHeight={setBoxHeight} />
          </Paper>
        </Grid>
        <Grid xs={12} md={3} sx={{ position: 'relative', zIndex: 10 }}>
          <Paper sx={{ p: 3, width: '100%', height: '100%' }}>
            <ValueLocked currency={currency} />
          </Paper>
        </Grid>
        <Grid xs={12} md={9}>
          <Paper sx={{ p: 3, width: '100%', height: '100%' }}>
            <Button onClick={() => setAreaChart(!areaChart)}>Switch Area</Button>
            <XyChart
              height={600}
              tokenList={sortedFilteredTokensList}
              areaChart={areaChart} // false for line chart
              totalValue={totalValue}
            />
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

const tokenList: IExtendedToken[] = [
  {
    name: 'Ergo',
    tokenId: '0000000000000000000000000000000000000000000000000000000000000000',
    pctChange: 212,
    amount: 1234516813543,
    value: 1.14,
    decimals: 9
  },
  {
    name: 'Ergopad',
    tokenId: 'd71693c49a84fbbecd4908c94813b46514b18b67a99952dc1e6e4791556de413',
    pctChange: -34,
    amount: 23046114,
    value: 0.0054,
    decimals: 2
  },
  {
    name: 'QUACKS',
    tokenId: '089990451bb430f05a85f4ef3bcb6ebf852b3d6ee68d86d78658b9ccef20074f',
    pctChange: 212,
    amount: 23046142261,
    value: 0.0054,
    decimals: 6
  },
  {
    name: 'Paideia',
    tokenId: '1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489',
    pctChange: -474,
    amount: 230461561,
    value: 0.0052,
    decimals: 4
  },
  {
    name: 'SigUSD',
    tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
    pctChange: 12,
    amount: 1234,
    value: 1.34,
    decimals: 2
  },
  {
    name: 'CYPX',
    tokenId: '01dce8a5632d19799950ff90bca3b5d0ca3ebfa8aaafd06f0cc6dd1e97150e7f',
    pctChange: 233,
    amount: 2304611251,
    value: 0.0005087793,
    decimals: 4
  },
  {
    name: 'SPF',
    tokenId: '9a06d9e545a41fd51eeffc5e20d818073bf820c635e2a9d922269913e0de369d',
    pctChange: 452,
    amount: 230461,
    value: 0.0054,
    decimals: 6
  },
  {
    tokenId: "0040ae650c4ed77bcd20391493abe84c1a9bb58ee88e87f15670c801e2fc5983",
    amount: 8989997000,
    decimals: 4,
    name: "bPaideia",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "00b1e236b60b95c2c6f8007a9d89bc460fc9e78f98b09faec9449007b40bccf3",
    amount: 10000,
    decimals: 4,
    name: "EGIO",
    tokenType: "",
    value: 0.0000491945
  },
  {
    tokenId: "03847a1396442a43fe5500b386fee0b4a9e52f2291473f96b6ec2ac886b1f835",
    amount: 1,
    decimals: 0,
    name: "Cybercitizen",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "03908f98cb67f4c0e27ce5c3bace0c020ff71aaf56b33f78482468b2b31b5974",
    amount: 1,
    decimals: 0,
    name: "Inferno Black",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "0497aca2cd732171e4ccd747d8894365b330722216925614f88c3cc7fe30f2e4",
    amount: 1,
    decimals: 0,
    name: "Bitmask Scroll",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "065c2c7c846347c3ef77db40772c2b602b682179dbdd67c7cde673cb9465744b",
    amount: 1,
    decimals: 0,
    name: "Haborym",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "09102715b2e5e68e6f5574400119f776bdb26155df59c815ff3bc6c8affe0ffd",
    amount: 1,
    decimals: 0,
    name: "Vike",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "092e9187300bb854e43f03e9a94d4e586e0ba4eeabfc37834b1eb219fffb3945",
    amount: 3,
    decimals: 0,
    name: "Test22cv",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "1ac0b97e43a50ed3825306cf652dd6a771e0fe37191b7ba8ed1c08bd7a4e327c",
    amount: 1,
    decimals: 0,
    name: "Bitmask #210",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "2244637c0d1f48096e66fd24d29b84dbd6098ad7629cc5f81cf7dc038ac387b6",
    amount: 1,
    decimals: 0,
    name: "Xaze",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "257e19551115114d8d326f77a8a42ecd91f62519d4bef12a396b14d9624e3518",
    amount: 1,
    decimals: 0,
    name: "Frorone",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "2cc252429c726ee1db49ce62284cbee9f4baece8f372c664884f3dade4afecdd",
    amount: 1,
    decimals: 0,
    name: "CyberPet #75",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "2fc799b45d62217d41b4a9e25b906f513bf2829e687b09bbcf7c7a7e3b8d533a",
    amount: 1,
    decimals: 0,
    name: "Toteor",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "46e6a7b636c37e760b97ef4da249b5267599e49a0b963c1a9667b7a4ee171d48",
    amount: 1,
    decimals: 0,
    name: "Bitmask #233",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "4881720d70a1c817befaf7ebbced9b464b622ed8a2ba52237ef8dcae8e007b34",
    amount: 1,
    decimals: 0,
    name: "Rare Select 5 pack",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "50bbeef36be8f8ceff08baa1095c37025bffcc1c173b47ee2c320e81d9026764",
    amount: 1,
    decimals: 0,
    name: '',
    tokenType: "",
    value: 0
  },
  {
    tokenId: "53971aea5aaa771a2b37f12814f1a3a681e1e11e5ae8a71bb63cd10064cfd81a",
    amount: 1,
    decimals: 0,
    name: "Name 2",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "59ee24951ce668f0ed32bdb2e2e5731b6c36128748a3b23c28407c5f8ccbf0f6",
    amount: 100,
    decimals: 0,
    name: "WALRUS",
    tokenType: "",
    value: 0.0060213236
  },
  {
    tokenId: "5e627d89c772ecc1eccf2b136ec3c5184c60dcf9df0f3fe157c13aaf0f56287b",
    amount: 1,
    decimals: 0,
    name: "Goclone",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "609eb93c50e8ac501e0f71feb020c69eae9ac0e3ced2c4b995a1ae4d4e6cd298",
    amount: 1,
    decimals: 0,
    name: "Name 4",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "64f2b51e6ca574f541eddbd4857c5454936f4a505be4ad36997596e057f5b737",
    amount: 1,
    decimals: 0,
    name: "Stodwingne",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "6c3c491af6774fb385a48b798e15078133be483610bf060a0a1acbb3f3ca95dd",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #1",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "6d78668fd0ac94c0142a3d6422a27e37023495a8414e4cd48cdb1fbdd2c33a7a",
    amount: 1,
    decimals: 0,
    name: "Paideia Stake Key",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "6e94bd7cb48c348f4645e6aebb34de81404a4ddbd1b8bc34edce25e3b02e4d2e",
    amount: 1,
    decimals: 0,
    name: "Mirian",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "78ddbad051ef184bd58577ed39b488cb3c97e18076019109d045c1f830efa167",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #215",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "806d79cb7f416bfed48e17d380c6a18bac0520abe690f01172afbc108a67dda2",
    amount: 1,
    decimals: 0,
    name: "Mastema",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "86dffb029544c432319ecafdecbde45bb7254ca371cd87a866467a702ed743c2",
    amount: 1,
    decimals: 0,
    name: "Frostbite",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "9581d29ccbc2d9d56d2cb2c2350826b6f462ee98bf7bf21686e67904878f8410",
    amount: 1,
    decimals: 0,
    name: "Carmilla Genesis #2",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "9b40010aaea157090da3052f852bd6832055451b0bf173c35dd027b09894aa9f",
    amount: 1,
    decimals: 0,
    name: "Cyca",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "a7e1607209e139c2ee2f3d7ce374e63a37efd74a0925eb7aa1c38df45c970e0d",
    amount: 1,
    decimals: 0,
    name: "Infete",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "ad3e4e4ef9fb6cbb51729b3805c0522c894e1ff23879d648ffc41e24d6df8145",
    amount: 1,
    decimals: 0,
    name: "Cybercitizen #1788",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "b0277b95d10d56952833fc3abcc54a5685cfe1ee985aa149194682bc46feb26c",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #189",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "ba5856162d6342d2a0072f464a5a8b62b4ac4dd77195bec18c6bf268c2def831",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #3",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "c16133159c528e1af8dfe7a7d1947ec01a59bd2c4773b3c7166758ca11be75e1",
    amount: 1,
    decimals: 0,
    name: "Gognusnger",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "c70ef773d7be6bb25e655848905e373ad34a172b38193907809f9aa11cd142fe",
    amount: 1,
    decimals: 0,
    name: "Bitmask #248",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "cc765ca970b320d59cd26a15d7f2eaaabd9421e28ad822bd795478784d434b6e",
    amount: 1,
    decimals: 0,
    name: "Xalioste",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "cda4c406695ef0c126feffe4ad267e0fca61d354a85b5cc1bb255cbe2dbd8466",
    amount: 1,
    decimals: 0,
    name: "Ibis Genesis #6",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "d21625af913d0847e0924fc9b26b3baafad3766ea1232e5ece6f3c7c89da5fbb",
    amount: 1,
    decimals: 0,
    name: "Smorumge",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "e007d907c006785b2050042b4a7a262e913f3a5a86bfac3c518fb4c8c357457b",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #224",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "f19ec5b9ec47722174aab2726c32c69189db449ef957fea54de0eb233942f7c5",
    amount: 1,
    decimals: 0,
    name: "duckpools Public Vesting Key",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "f3ee398bc4b6068b8a3812bc98bfb93547dde8bbcbde8c767063560a35da20e9",
    amount: 1,
    decimals: 0,
    name: "Hermbrine",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "f521ecc084111e19b69ccc934066d861b12dc483d13ba67dc3031da3f6c69940",
    amount: 1,
    decimals: 0,
    name: "Ritual Scroll #4",
    tokenType: "",
    value: 0
  },
  {
    tokenId: "fdb74ff4b75836267cc3ca9a6c163770d263429b6a48e9ecfd6a83d4c60b14c6",
    amount: 1,
    decimals: 0,
    name: "Ibis Genesis #2",
    tokenType: "",
    value: 0
  }
]