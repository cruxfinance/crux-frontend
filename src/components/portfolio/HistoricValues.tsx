import React, { FC, useState, useEffect } from 'react';
import {
  Typography,
  Container,
  useTheme,
  Box,
  Button,
  useMediaQuery,
  Icon,
  ToggleButtonGroup,
  ToggleButton
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import StackedBar from '@components/charts/StackedBar';
import { Currencies } from '@utils/currencies';
import { IReducedToken } from '@pages/portfolio';
import XyChart from '@components/charts/XyChart';
import SsidChartIcon from '@mui/icons-material/SsidChart';

interface IHistoricValues {
  currency: Currencies;
  exchangeRate: number;
  tokenList: IReducedToken[];
  totalValue: number;
}

const HistoricValues: FC<IHistoricValues> = ({ currency, exchangeRate, tokenList, totalValue }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [areaChart, setAreaChart] = useState('area')

  // const areaChartRef = useRef<HTMLElement | null>(null);

  // useEffect(() => {
  //   if (areaChartRef.current) {
  //     const height = areaChartRef.current.offsetHeight;
  //     setAreaHeight(`${height}px`);
  //   }
  // }, [areaChartRef]);

  const handleChartToggle = (
    event: React.MouseEvent<HTMLElement>,
    newAreaChart: string | null,
  ) => {
    if (newAreaChart !== null) {
      setAreaChart(newAreaChart);
    }
  };

  return (
    <Box>
      <Grid container alignItems="flex-start" sx={{ mb: 2 }}>
        <Grid xs>
          <Typography variant="h6">
            Portfolio History (ERG)
          </Typography>
        </Grid>
        <Grid>
          <ToggleButtonGroup
            value={areaChart}
            exclusive
            onChange={handleChartToggle}
            aria-label="chart toggle"
          >
            <ToggleButton value="area" aria-label="stacked area chart">
              <Icon>
                area_chart
              </Icon>
            </ToggleButton>
            <ToggleButton value="line" aria-label="line chart">
              <SsidChartIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>
      <Box sx={{ height: '600px', width: upSm ? '100%' : '100vw', ml: upSm ? 0 : -1, position: 'relative' }}>
        <XyChart
          currency={currency}
          exchangeRate={exchangeRate}
          height={600}
          tokenList={tokenList}
          areaChart={areaChart === 'area' ? true : false} // false for line chart
          totalValue={totalValue}
        />
      </Box>
    </Box>
  );
};

export default HistoricValues;