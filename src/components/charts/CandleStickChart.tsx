import {
  Button,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
  CircularProgress,
  Fade
} from '@mui/material';
import Link from '../Link';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { useMemo, useState } from 'react';
import { useEffect, useRef } from 'react';
import axios from 'axios';

const stepUnitMapper = {
  '1h': {
    stepSize: 1,
    stepUnit: 'h',
    inSeconds: 3600,
  },
  '4h': {
    stepSize: 4,
    stepUnit: 'h',
    inSeconds: 14400,
  },
  '1d': {
    stepSize: 1,
    stepUnit: 'd',
    inSeconds: 86400,
  },
  '1w': {
    stepSize: 1,
    stepUnit: 'w',
    inSeconds: 604800,
  },
  '1m': {
    stepSize: 1,
    stepUnit: 'm',
    inSeconds: 2.6298e+6
  },
};

const pairBaseCurrencyMapper = {
  ergopad_sigusd: 'sigusd',
  ergopad_erg: 'erg',
};

const CandleStickChart = () => {
  const theme = useTheme()
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const [rawData, setRawData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[]>([]);
  const [stepUnit, setStepUnit] = useState('1h');
  const [pair, setPair] = useState('ergopad_erg');
  const [loading, setLoading] = useState(false)

  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  function convertToUTCTimestamp(isoString: string): number {
    return Math.floor(new Date(isoString).getTime() / 1000);
  }

  const candleData = rawData.map((dataPoint) => {
    return {
      time: convertToUTCTimestamp(dataPoint.time),
      open: dataPoint.open,
      high: dataPoint.high,
      low: dataPoint.low,
      close: dataPoint.close,
    };
  });

  const volumeData = rawData.map((dataPoint) => {
    var color = theme.palette.primary.main
    if (dataPoint.open > dataPoint.close) color = theme.palette.secondary.main
    return {
      time: convertToUTCTimestamp(dataPoint.time),
      value: dataPoint.volume,
      color: color
    };
  });

  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.replaceChildren();
      const Chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          background: { color: theme.palette.background.paper },
          textColor: theme.palette.text.primary,
        },
        grid: {
          vertLines: {
            color: 'rgba(197, 203, 206, 0)',
          },
          horzLines: {
            color: 'rgba(197, 203, 206, 0)',
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: 'rgba(197, 203, 206, 0.8)',
        },
        timeScale: {
          borderColor: 'rgba(197, 203, 206, 0.8)',
          timeVisible: true,
        },
      });

      const candleSeries = Chart.addCandlestickSeries({
        upColor: theme.palette.primary.main,
        downColor: theme.palette.secondary.main,
        borderDownColor: theme.palette.secondary.main,
        borderUpColor: theme.palette.primary.main,
        wickDownColor: theme.palette.secondary.main,
        wickUpColor: theme.palette.primary.main,
        priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
      });

      const volumeSeries = Chart.addHistogramSeries({
        color: theme.palette.secondary.main,
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: ''
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      // @ts-ignore
      candleSeries.setData(candleData);
      // @ts-ignore
      volumeSeries.setData(volumeData);

      // Chart.timeScale().fitContent();
      Chart.timeScale().applyOptions({
        barSpacing: 10,
      });

      const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
        const newRect = entries[0].contentRect;
        Chart.applyOptions({ height: newRect.height, width: newRect.width });
      })

      resizeObserver.observe(chartContainerRef.current)

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [rawData, chartContainerRef])

  useEffect(() => {
    const getData = async () => {
      setLoading(true)
      try {
        const res = await axios.get(
          `${process.env.API_URL}/asset/ohlcv/${pairBaseCurrencyMapper[pair as keyof typeof pairBaseCurrencyMapper]}/ergopad/${stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].stepSize}/${stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].stepUnit}/${new Date(Date.now() - (400000 * stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].inSeconds)).toISOString().slice(0, 10)}/${new Date(Date.now() + 94608000000).toISOString().slice(0, 10)}?offset=0&limit=500`
        );
        setRawData(res.data);
      } catch (e) {
        console.log(e);
      }
      setLoading(false)
    };

    console.log(`${process.env.API_URL}/asset/ohlcv/${pairBaseCurrencyMapper[pair as keyof typeof pairBaseCurrencyMapper]}/ergopad/${stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].stepSize}/${stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].stepUnit}/${new Date(Date.now() - (400000 * stepUnitMapper[stepUnit as keyof typeof stepUnitMapper].inSeconds)).toISOString().slice(0, 10)}/${new Date(Date.now() + 94608000000).toISOString().slice(0, 10)}?offset=0&limit=500`)

    getData();
  }, [stepUnit, pair]);

  const lastPrice = rawData.length
    ? Math.round(rawData[rawData.length - 1].close * 10000) / 10000
    : 1;

  const handleStepChange = (e: any, newAlignment: string) => {
    if (newAlignment !== null) {
      setStepUnit(newAlignment);
    }
  };

  const handlePairChange = (e: any, newAlignment: string) => {
    if (newAlignment !== null) {
      setPair(newAlignment);
    }
  };



  return (
    <>
      <Typography variant="h6" sx={{ mb: 2, width: 'auto' }}>
        1 ErgoPad = {lastPrice} {' '}
        {pairBaseCurrencyMapper[pair as keyof typeof pairBaseCurrencyMapper]}
      </Typography>
      <Grid>
        <Grid container>
          <Grid item md={6} xs={12}>
            <ToggleButtonGroup
              value={pair}
              exclusive
              onChange={handlePairChange}
              sx={{ mb: 2, mt: 0 }}
              size="small"
            >
              <ToggleButton value="ergopad_sigusd">SigUSD</ToggleButton>
              <ToggleButton value="ergopad_erg">Erg</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid
            item
            md={6}
            xs={12}
            sx={{
              display: 'flex',
              justifyContent: matches ? 'flex-end' : 'flex-start',
            }}
          >
            <ToggleButtonGroup
              value={stepUnit}
              exclusive
              onChange={handleStepChange}
              sx={{ mb: 2, mt: 0 }}
              size="small"
            >
              <ToggleButton value="1h">1 hour</ToggleButton>
              <ToggleButton value="4h">4 hours</ToggleButton>
              <ToggleButton value="1d">1 day</ToggleButton>
              <ToggleButton value="1w">1 week</ToggleButton>
              {/* <ToggleButton value="1m">1 month</ToggleButton> */}
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        <Box
          sx={{
            mb: '24px',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Fade in={loading}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme.palette.background.paper,
                zIndex: 100
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CircularProgress size={64} />
              </Box>
            </Box>
          </Fade>
          <div ref={chartContainerRef} />
        </Box>
        <Grid sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href={'https://app.spectrum.fi/ergo/swap'}
            aria-label="spectrum"
            sx={{ mb: 1, mx: 3 }}
          >
            <Button
              variant="contained"
            >
              Trade
            </Button>
          </Link>
        </Grid>
      </Grid>
    </>
  );
};

export default CandleStickChart;
