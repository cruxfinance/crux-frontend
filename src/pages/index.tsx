import React from "react";
import type { NextPage } from "next";
import {
  Container,
  Typography,
  useTheme,
  useMediaQuery,
  Grid,
  Button,
  Box,
  Stack,
  Paper,
  Grow,
  List,
  ListItem,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useInView } from "react-intersection-observer";
import wideBg from "@public/city-tiltshift3.jpg";
import Timeline, { ITimelineItem } from "@components/Timeline";
import { styled } from '@mui/system';
import Feature from "@components/Feature";

const timeline: ITimelineItem[] = [
  {
    date: "Q3 2023",
    listItems: [
      "July 1st. Open phase-one funding round.",
      "End of July: Work commences towards milestone one.",
    ],
  },
  {
    date: "Q4 2023",
    listItems: [
      "November: Launch liquidity pool",
      "December: Release Portfolio Management platform with charting package.",
      "December: Launch phase-two funding round after completion of milestone one.",
      "December: Open subscriptions to early supporters.",
    ],
  },
  {
    date: "Q1 2024",
    listItems: ["January: Locked liquidity providers begin accruing rewards."],
  },
  {
    date: "Q2 2024",
    listItems: [
      "Deliver Q1/24 report subscriber metrics, updated token metrics, total burnt tokens to date, new total maximum token supply.",
      "June: Launch comprehensive trading platform.",
    ],
  },
];

const StyledList = styled(List)({
  listStyle: 'disc',
  listStyleType: "disc",
  // listStylePosition: 'inside',
  padding: 0,
  marginLeft: '32px',
  marginBottom: '2rem',
  "& li": {
    display: 'list-item',
    paddingLeft: '6px',
  },
});

const StyledListItem = styled(ListItem)({
  display: 'list-item',
  paddingTop: 0,
});

const features = [
  {
    title: 'Portfolio Manager & Charting Package',
    content: <Typography variant="subtitle1">
      Manage your portfolio, track P&amp;L, follow your investments,
      and see a summary of every trade you made in a given time
      period. Visualize ecosystem orderflow for traded assets
      including NFTs, follow whale movements, and add custom reports
      with future modelling. From basic tools to advanced features,
      everthing is at your fingertips, through charting tools
      including Simple & Exponential Moving Averages, Fibonacci
      Retracements & Extensions, RSI, MACD, Volume metrics, Trendlines
      & more.
    </Typography>,
    image: '/charts.png',
    imageAlt: 'Financial Charts'
  },
  {
    title: 'Notifications & Alerts',
    content: <Typography variant="subtitle1">
      When trading, it&apos;s important to respond quickly to market
      changes. Crux&apos;s notification system allows you to set custom
      notifications for all tracked events. Examples include P2P,
      staking, redeeming, swaps, liquidity provisions, yield farming,
      lending, borrowing, nft sales/purchases, and bridging tx&apos;s. Anytime
      an address is engaged, you will have the choice to receive a
      timely, detailed notification of the event that&apos;s occurring.
    </Typography>,
    image: '/alert2.png',
    imageAlt: 'Mobile Notification'
  },
  {
    title: 'Accounting Tools',
    content: <Typography variant="subtitle1">
      One of the most important features of any trading platform is tax reporting. Add any number of tracked wallets and Crux will print out a detailed description of all transactions. Download in CSV formats compatible with a variety of platforms and simplify your annual accounting, saving you time and money.
    </Typography>,
    image: '/desk-screens.png',
    imageAlt: 'Trading Desk'
  },
  {
    title: 'Trading Floor',
    content: <><Typography variant="subtitle1">
      Interact with all the popular Ergo smart contracts and tools
      without ever leaving the app, including but not limited to:
    </Typography>
      <StyledList dense>
        <StyledListItem>Trade (AMM/Orderbook)</StyledListItem>
        <StyledListItem>Lend/borrow (Sigmafi/duckpools/EXLE)</StyledListItem>
        <StyledListItem>SigUSD, dexy, mint redeem</StyledListItem>
        <StyledListItem>Provide LP/Yield farm (Spectrum/duckpools)</StyledListItem>
        <StyledListItem>Ergopad; stake, redeem vested tokens</StyledListItem>
        <StyledListItem>Grid trading bots</StyledListItem>
        <StyledListItem>Sigma O Options panel</StyledListItem>
        <StyledListItem>Rosen Bridge (with liquidity panel)</StyledListItem>
        <StyledListItem>Babel fee liquidity provision/visualization</StyledListItem>
      </StyledList></>,
    image: '/accountant.png',
    imageAlt: 'Accountant'
  }
]

const inViewOptions = {
  threshold: 1,
  triggerOnce: true
};

const Home: NextPage = () => {
  const theme = useTheme();
  // const trigger = useScrollTrigger({ threshold: 800 });
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const [ref5, inView5] = useInView(inViewOptions);
  // const [ref6, inView6] = useInView({ ...inViewOptions, threshold: 0.3 });

  // const logoLinkSx = {
  //   display: "block",
  //   color: theme.palette.text.primary,
  //   "&:hover": {
  //     "& .MuiSvgIcon-root": {
  //       color: theme.palette.primary.main,
  //     },
  //   },
  // };



  return (
    <>
      {/* Hero section */}
      <Box
        sx={{
          "&:before": {
            content: '""',
            display: "inline-block",
            width: "3440px",
            height: "1485px",
            backgroundImage: `url(${wideBg.src})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "top center",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: "0",
            backgroundSize: {
              xs: "50%",
              md: "70%",
              xl: "100%",
            },
          },
          // backgroundColor: 'rgba(255,255,255,1)',
          // backgroundImage: `url(${wideBg.src})`,
          // backgroundRepeat: 'no-repeat',
          // backgroundPosition: 'center',
          mt: "-128px",
          mb: "128px",
          // display: 'flex'
        }}
        id="top"
      >
        <Container
          sx={{
            pt: "30vh",
            minHeight: "100vh",
            // mb: 12
            position: "relative",
          }}
        >
          <Paper
            sx={{
              mx: "auto",
              background: "rgba(0,3,16,0.9)",
              p: 4,
              backdropFilter: "blur(10px)",
              borderRadius: "36px",
              maxWidth: "md",
            }}
            elevation={12}
          >
            <Typography
              variant="h2"
              fontWeight={700}
              align="center"
              gutterBottom
            >
              Feature rich DeFi tools for the Ergo Ecosystem
            </Typography>
            <Typography variant="h6" align="center" paragraph>
              Track your portolio and interact with eUTXO DeFi in one place. Set
              alerts, place orders, monitor P&L, and even print tax reports.
            </Typography>
            <Stack
              sx={{ pt: 3 }}
              direction="row"
              spacing={2}
              justifyContent="center"
            >
              <Button variant="contained" href="/">
                IDO Info
              </Button>
              <Button variant="contained" disabled>
                Whitepaper
              </Button>
            </Stack>
          </Paper>
          {/* <Box maxWidth='lg' sx={{ mx: 'auto' }}>
            <Typography variant="body1" sx={{ pt: 12, textTransform: 'uppercase' }} align="center" color="text.secondary" paragraph>
              In partnership with:
            </Typography>
            <Grid container alignItems="center" justifyContent="space-around">
              <Grid item>
                <Link
                  href="https://teddyswap.org"
                  sx={logoLinkSx}
                >
                  <TeddyswapLogo sx={{ fontSize: '160px', height: '100px' }} />
                </Link>
              </Grid>
              <Grid item>
                <Link
                  href="https://www.harmoniclabs.tech"
                  sx={logoLinkSx}
                >
                  <HarmonicLabsLogo sx={{ fontSize: '190px', height: '100px' }} />
                </Link>
              </Grid>
              <Grid item>
                <Link
                  href="https://www.ergopad.io"
                  sx={logoLinkSx}
                >
                  <ErgopadLogo sx={{ fontSize: '160px', height: '100px' }} />
                </Link>
              </Grid>
              <Grid item>
                <Link
                  href="https://www.paideia.im"
                  sx={logoLinkSx}
                >
                  <PaideiaLogo sx={{ fontSize: '140px', height: '100px' }} />
                </Link>
              </Grid>
              <Grid item>
                <Link
                  href="https://www.blockheads.one"
                  sx={logoLinkSx}
                >
                  <BlockheadsLogo sx={{ fontSize: '160px', height: '100px' }} />
                </Link>
              </Grid>
            </Grid>
          </Box> */}
        </Container>
      </Box>
      {/* End hero section */}

      {/* Features */}
      <Container sx={{ position: "relative", mb: 24 }} id="features">
        <Grid container sx={{ mb: 3 }}>
          <Grid item md={1}></Grid>
          <Grid item md={10}>
            <Typography
              variant="h2"
              fontWeight={600}
              gutterBottom
              sx={{ textAlign: "center" }}
            >
              Platform Features
            </Typography>
          </Grid>
          <Grid item md={1}></Grid>
        </Grid>
        {features.map((item, i) => {
          const key = uuidv4()
          return (
            <Feature
              title={item.title}
              content={item.content}
              image={item.image}
              imageAlt={item.imageAlt}
              index={i}
              key={key}
            />
          )
        })}
      </Container>
      {/* END features */}

      {/* Roadmap */}
      <Container sx={{ mb: 24 }} id="roadmap">
        <Grid container sx={{ mb: 3 }} ref={ref5}>
          <Grid item md={1}></Grid>
          <Grid item md={10}>
            <Typography
              variant="h2"
              fontWeight={600}
              gutterBottom
              sx={{ textAlign: "center" }}
            >
              Roadmap
            </Typography>
          </Grid>
          <Grid item md={1}></Grid>
        </Grid>
        <Grow in={inView5} {...(inView5 ? { timeout: 500 } : {})}>
          <Box>
            <Timeline timeline={timeline} />
          </Box>
        </Grow>
      </Container>

      {/* Tokenomics */}
      <Container maxWidth="lg" sx={{ mb: 12 }} id="tokenomics">
        <Grid container sx={{ mb: 3 }}>
          <Grid item md={1}></Grid>
          <Grid item md={10}>
            <Typography
              variant="h2"
              fontWeight={600}
              gutterBottom
              sx={{ textAlign: "center" }}
            >
              Tokenomics
            </Typography>
          </Grid>
          <Grid item md={1}></Grid>
        </Grid>
        <Typography sx={{ textAlign: "center" }}>Coming soon. </Typography>
      </Container>
    </>
  );
};

export default Home;
