import React, { FC, useRef, useEffect, useState } from "react";
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
  IconButton,
  Paper,
  Grow,
  Slide,
  useScrollTrigger,
  List,
  ListItem,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useInView } from "react-intersection-observer";
import wideBg from "@public/city-tiltshift3.jpg";
import Timeline, { ITimelineItem } from "@components/Timeline";

const timeline: ITimelineItem[] = [
  {
    date: 'Q3 2023',
    listItems: [
      'July 1st. Open phase-one funding round.',
      'End of July: Work commences towards milestone one.',
    ]
  },
  {
    date: 'Q4 2023',
    listItems: [
      'November: Launch liquidity pool',
      'December: Release Portfolio Management platform with charting package.',
      'December: Launch phase-two funding round after completion of milestone one.',
      'December: Open subscriptions to early supporters.',
    ]
  },
  {
    date: 'Q1 2024',
    listItems: [
      'January: Locked liquidity providers begin accruing rewards.',
    ]
  },
  {
    date: 'Q2 2024',
    listItems: [
      'Deliver Q1/24 report subscriber metrics, updated token metrics, total burnt tokens to date, new total maximum token supply.',
      'June: Launch comprehensive trading platform.',
    ]
  }
];

// import bannerBg from '@public/banner.jpg'
import Image from "next/image";

const inViewOptions = {
  threshold: 1,
  triggerOnce: true,
};

const Home: NextPage = () => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const trigger = useScrollTrigger({ threshold: 800 });
  const [ref1, inView1] = useInView(inViewOptions);
  const [ref2, inView2] = useInView(inViewOptions);
  const [ref3, inView3] = useInView(inViewOptions);
  const [ref4, inView4] = useInView({ ...inViewOptions, threshold: 0.5 });
  const [ref5, inView5] = useInView(inViewOptions);
  const [ref6, inView6] = useInView({ ...inViewOptions, threshold: 0.3 });

  const logoLinkSx = {
    display: "block",
    color: theme.palette.text.primary,
    "&:hover": {
      "& .MuiSvgIcon-root": {
        color: theme.palette.primary.main,
      },
    },
  };

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
              <Button variant="contained" color="secondary" href="/">
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

        <Grid
          container
          maxWidth="lg"
          alignItems="center"
          spacing={3}
          sx={{ mb: 12, mx: "auto" }}
          ref={ref1}
        >
          <Slide in={inView1} direction="right" timeout={300}>
            <Grid item md={6}>
              <Paper sx={{ height: "400px", maxWidth: "550px", p: 2 }}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/website-thumb-1.png"
                    fill={true}
                    alt="Website UI"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Slide>
          <Slide in={inView1} direction="left" timeout={600}>
            <Grid item md={6}>
              <Typography variant="h4" fontWeight={600}>
                Crowd-funding With Benefits
              </Typography>
              <Typography variant="subtitle1">
                Rather than being backed by a few VCs, we believe blockchain
                projects should be funded by the community, and the community
                should profit from their successes. By investing in IDOs, you
                get in before the token is listed and receive preferential
                pricing as appreciation for your faith in the project.{" "}
              </Typography>
            </Grid>
          </Slide>
        </Grid>

        <Grid
          container
          maxWidth="lg"
          alignItems="center"
          spacing={3}
          sx={{ mb: 12, mx: "auto" }}
          ref={ref2}
        >
          <Slide in={inView2} direction="right" timeout={600}>
            <Grid item md={6}>
              <Typography variant="h4" fontWeight={600}>
                Crowd-funding With Benefits
              </Typography>
              <Typography variant="subtitle1">
                Rather than being backed by a few VCs, we believe blockchain
                projects should be funded by the community, and the community
                should profit from their successes. By investing in IDOs, you
                get in before the token is listed and receive preferential
                pricing as appreciation for your faith in the project.{" "}
              </Typography>
            </Grid>
          </Slide>
          <Slide in={inView2} direction="left" timeout={300}>
            <Grid item md={6}>
              <Paper sx={{ height: "400px", maxWidth: "550px", p: 2 }}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/website-thumb-1.png"
                    fill={true}
                    alt="Website UI"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Slide>
        </Grid>

        <Grid
          container
          maxWidth="lg"
          alignItems="center"
          spacing={3}
          sx={{ mb: 12, mx: "auto" }}
          ref={ref3}
        >
          <Slide in={inView3} direction="right" timeout={300}>
            <Grid item md={6}>
              <Paper sx={{ height: "400px", maxWidth: "550px", p: 2 }}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/website-thumb-1.png"
                    fill={true}
                    alt="Website UI"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Slide>
          <Slide in={inView3} direction="left" timeout={600}>
            <Grid item md={6}>
              <Typography variant="h4" fontWeight={600}>
                Crowd-funding With Benefits
              </Typography>
              <Typography variant="subtitle1">
                Rather than being backed by a few VCs, we believe blockchain
                projects should be funded by the community, and the community
                should profit from their successes. By investing in IDOs, you
                get in before the token is listed and receive preferential
                pricing as appreciation for your faith in the project.{" "}
              </Typography>
            </Grid>
          </Slide>
        </Grid>

        <Grid
          container
          maxWidth="lg"
          alignItems="center"
          spacing={3}
          sx={{ mb: 6, mx: "auto" }}
          ref={ref4}
        >
          <Slide in={inView4} direction="right" timeout={600}>
            <Grid item md={6}>
              <Typography variant="h4" fontWeight={600}>
                Crowd-funding With Benefits
              </Typography>
              <Typography variant="subtitle1">
                Rather than being backed by a few VCs, we believe blockchain
                projects should be funded by the community, and the community
                should profit from their successes. By investing in IDOs, you
                get in before the token is listed and receive preferential
                pricing as appreciation for your faith in the project.{" "}
              </Typography>
            </Grid>
          </Slide>
          <Slide in={inView4} direction="left" timeout={300}>
            <Grid item md={6}>
              <Paper sx={{ height: "400px", maxWidth: "550px", p: 2 }}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/website-thumb-1.png"
                    fill={true}
                    alt="Website UI"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Slide>
        </Grid>
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