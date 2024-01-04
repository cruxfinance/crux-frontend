import React, { memo, useEffect } from "react";
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
  TextField,
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import wideBg from "@public/city-tiltshift3.jpg";
import Timeline, { ITimelineItem } from "@components/Timeline";
import { styled } from "@mui/system";
import MemoizedFeatureList from "@components/MemoizedFeatureList";
import Feature, { IFeature } from "@components/Feature";
import ButtonLink from "@components/ButtonLink";
import Tokenomics, { TokenomicsData } from "@components/Tokenomics";
import BlobHero from "@components/svgs/BlobHero";
import Image from "next/image";
import BlobTokenomics from "@components/svgs/BlobTokenomics";
import { trpc } from "@lib/trpc";

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
  listStyle: "disc",
  listStyleType: "disc",
  // listStylePosition: 'inside',
  padding: 0,
  marginLeft: "32px",
  marginBottom: "2rem",
  "& li": {
    display: "list-item",
    paddingLeft: "6px",
  },
});

const StyledListItem = styled(ListItem)({
  display: "list-item",
  paddingTop: 0,
});

const features: IFeature[] = [
  {
    title: "Portfolio Manager & Charting Package",
    content: (
      <Typography variant="subtitle1">
        Manage your portfolio, track P&amp;L, follow your investments, and see a
        summary of every trade you made in a given time period. Visualize
        ecosystem orderflow for traded assets including NFTs, follow whale
        movements, and add custom reports with future modeling. From basic tools
        to advanced features, everything is at your fingertips, through charting
        tools including Simple & Exponential Moving Averages, Fibonacci
        Retracements & Extensions, RSI, MACD, Volume metrics, Trendlines & more.
      </Typography>
    ),
    image: "/charts.png",
    imageAlt: "Financial Charts",
  },
  {
    title: "Notifications & Alerts",
    content: (
      <Typography variant="subtitle1">
        When trading, it&apos;s important to respond quickly to market changes.
        Crux&apos;s notification system allows you to set custom notifications
        for all tracked events. Examples include P2P, staking, redeeming, swaps,
        liquidity provisions, yield farming, lending, borrowing, nft
        sales/purchases, and bridging tx&apos;s. Anytime an address is engaged,
        you will have the choice to receive a timely, detailed notification of
        the event that&apos;s occurring.
      </Typography>
    ),
    image: "/alert2.png",
    imageAlt: "Mobile Notification",
  },
  {
    title: "Accounting Tools",
    content: (
      <Typography variant="subtitle1">
        One of the most important features of any trading platform is tax
        reporting. Add any number of tracked wallets and Crux will print out a
        detailed description of all transactions. Download in CSV formats
        compatible with a variety of platforms and simplify your annual
        accounting, saving you time and money.
      </Typography>
    ),
    image: "/accountant.png",
    imageAlt: "Accountant",
  },
  {
    title: "Trading Floor",
    content: (
      <>
        <Typography variant="subtitle1">
          Interact with all the popular Ergo smart contracts and tools without
          ever leaving the app, including but not limited to:
        </Typography>
        <StyledList dense>
          <StyledListItem>Trade (AMM/Orderbook)</StyledListItem>
          <StyledListItem>Lend/borrow (Sigmafi/duckpools/EXLE)</StyledListItem>
          <StyledListItem>SigUSD, dexy, mint redeem</StyledListItem>
          <StyledListItem>
            Provide LP/Yield farm (Spectrum/duckpools)
          </StyledListItem>
          <StyledListItem>Ergopad; stake, redeem vested tokens</StyledListItem>
          <StyledListItem>Grid trading bots</StyledListItem>
          <StyledListItem>Sigma O Options panel</StyledListItem>
          <StyledListItem>Rosen Bridge (with liquidity panel)</StyledListItem>
          <StyledListItem>
            Babel fee liquidity provision/visualization
          </StyledListItem>
        </StyledList>
      </>
    ),
    image: "/desk-screens.png",
    imageAlt: "Trading Desk",
  },
];

const inViewOptions = {
  threshold: 1,
  triggerOnce: true,
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
          mt: "-114px",
          maxHeight: "800px",
          minHeight: "600px",
          height: "100vh",
        }}
        id="top"
      >
        <Container sx={{ position: "relative", height: "100%" }}>
          <Box
            sx={{
              position: "absolute",
              top: "calc(50% + 70px)",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: -1,
              height: "551",
            }}
          >
            <Image
              src="/backgrounds/hero.png"
              width="597"
              height="551"
              alt={"background"}
            />
          </Box>
          <BlobHero
            sx={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: -2,
            }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 5,
              height: "100%",
              pt: "70px",
            }}
          >
            <Box>
              <Box>
                <Typography
                  variant="h2"
                  fontWeight={700}
                  gutterBottom
                  align="center"
                  sx={{
                    background: `linear-gradient(90deg, ${theme.palette.secondary.dark} 10%, ${theme.palette.primary.dark} 80%)`,
                    backgroundClip: "text",
                    textFillColor: "transparent",
                    mb: 5,
                    maxWidth: "750px",
                  }}
                >
                  Feature rich DeFi tools for the Ergo Ecosystem
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  align="center"
                  paragraph
                  sx={{ maxWidth: "720px", mb: 5 }}
                >
                  Track your portolio and interact with eUTXO DeFi in one place.
                  Set alerts, place orders, monitor P&L, and even print tax
                  reports.
                </Typography>
              </Box>

              <Stack
                sx={{ pt: 3 }}
                direction="row"
                spacing={4}
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  href="https://ergopad.io/projects/cruxfinance"
                  target="_blank"
                  sx={{
                    color: theme.palette.text.primary,
                    padding: upMd ? "16px 40px !important" : "",
                    fontSize: upMd ? "18px" : "16px",
                    fontWeight: 700,
                    borderRadius: "16px",
                  }}
                >
                  IDO Info
                </Button>
                <Button
                  variant="outlined"
                  href="https://docs.cruxfinance.io"
                  target="_blank"
                  sx={{
                    padding: upMd ? "16px 40px !important" : "",
                    fontSize: upMd ? "18px" : "16px",
                    fontWeight: 700,
                    borderRadius: "16px",
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                    },
                  }}
                >
                  Whitepaper
                </Button>
              </Stack>
            </Box>
          </Box>
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
        {/* {features.map((item, i) => {
          const key = uuidv4()
          return (
            <MemoFeature
              title={item.title}
              content={item.content}
              image={item.image}
              imageAlt={item.imageAlt}
              index={i}
              key={key}
            />
          )
        })} */}
        <MemoizedFeatureList features={features} />
      </Container>
      {/* END features */}

      {/* Roadmap */}
      <Container sx={{ mb: 24, position: "relative" }} id="roadmap">
        <BlobTokenomics
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: -2,
          }}
        />
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
      <Container
        sx={{ mb: 12, position: "relative", display: "block" }}
        id="tokenomics"
      >
        <Grid container sx={{ mb: 6 }}>
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
          <Grid item md={3}></Grid>
          <Grid item md={6}>
            <Typography gutterBottom sx={{ textAlign: "center" }}>
              The Crux token serves as the platform&apos;s primary payment
              option, providing subscribers a 30% discount, distributing 25% of
              revenue to staked token holders, and offering yield farming and a
              loyalty program based on user metrics.
            </Typography>
          </Grid>
          <Grid item md={3}></Grid>
        </Grid>
        {/* <Box sx={{
            p: 2,
            background: 'linear-gradient(106deg, rgba(56.42, 56.81, 62.69, 0.45) 0%, rgba(73.63, 74.14, 81.81, 0.33) 100%)',
            boxShadow: '3px 3px 9px rgba(0, 0, 0, 0.50)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}>
            <Box sx={{
              textAlign: 'center',
              color: '#F87E79',
              fontSize: 24,
              fontFamily: 'Bai Jamjuree',
              fontWeight: '700',
              wordWrap: 'break-word'
            }}>Test Glass</Box>
          </Box> */}
        {/* <Feature
          {...{
            title: 'Overview',
            content: <Typography variant="subtitle1">
              The Crux token&apos;s central utility is to serve as the platform&apos;s primary payment option. Discounts will be granted to subscribers who opt to pay dues using Crux. Paying subscription dues using the Crux token will award subscribers a 30% discount. In addition, 25% of platform revenue will be distributed to token holders who have staked their tokens. There will be yield farming with heavy distributions to early liquidity providers, and a loyalty program based on user metrics.
            </Typography>,
            image: '/crux-tokenomics-no-title.png',
            imageAlt: 'Crux Tokenomics Pie Chart',
            index: 0,
            aspect: '878 / 566'
          }} /> */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ width: "100%", textAlign: "center" }}>
            <Image
              src="/tokenomics.png"
              alt="tokenomics"
              width={555} // Original width of your image
              height={266} // Original height of your image
              style={{ maxWidth: "100%", height: "auto" }} // This will scale the image responsively
            />
          </Box>
        </Box>
        <Grid container>
          <Grid item md={1}></Grid>
          <Grid item xs={12} md={10}>
            <Tokenomics
              data={tokenomicsData}
              total={100000000}
              name="Crux Finance"
              ticker="CRUX"
            />
          </Grid>
          <Grid item md={1}></Grid>
        </Grid>
      </Container>
    </>
  );
};

const tokenomicsData: TokenomicsData[] = [
  {
    name: "Phase 1",
    amount: 10000000,
    value: 0.01,
    pct: "10%",
    tge: "-",
    length: "10 Months",
    lockup: "5 Months",
  },
  {
    name: "Phase 2",
    amount: 12000000,
    value: 0.015,
    pct: "12%",
    tge: "-",
    length: "6 Months",
    lockup: "4 Months",
  },
  {
    name: "Liquditiy DEX",
    amount: 1500000,
    value: 0.02,
    pct: "1.5%",
    tge: "100%",
    length: "-",
    lockup: "None",
  },
  {
    name: "Marketing",
    amount: 3500000,
    value: "-",
    pct: "3.5%",
    tge: "100%",
    length: "-",
    lockup: "None",
  },
  {
    name: "Treasury - Platform Expansion",
    amount: 22000000,
    value: "-",
    pct: "22%",
    tge: "100%",
    length: "-",
    lockup: "None",
  },
  {
    name: "Loyalty Program",
    amount: 20000000,
    value: "-",
    pct: "20%",
    tge: "-",
    length: "60 Months ",
    lockup: "8 Months",
  },
  {
    name: "Liquidity Incentives",
    amount: 16000000,
    value: "-",
    pct: "16%",
    tge: "-",
    length: "12 Months",
    lockup: "1 Months",
  },
  {
    name: "Team",
    amount: 15000000,
    value: "-",
    pct: "15%",
    tge: "-",
    length: "15 Months",
    lockup: "8 Months",
  },
];

export default Home;
