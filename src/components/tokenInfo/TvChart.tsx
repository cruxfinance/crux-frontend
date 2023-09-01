import React, { FC } from 'react';
import {
  useTheme,
  useMediaQuery,
} from '@mui/material';
import dynamic from "next/dynamic";
import {
  ChartingLibraryWidgetOptions,
} from "@utils/charts/charts/charting_library";
import { TVChartContainer } from '@components/charts/AdvancedChart';

// const TVChartContainer = dynamic(
//   () =>
//     import("@components/charts/AdvancedChart").then((mod) => mod.TVChartContainer),
//   { ssr: false }
// );

const MemoizedTVChartContainer = React.memo(TVChartContainer);

export interface ITrade {
  timestamp: Date;
  type: string;
  price: number;
  totalToken: number;
  totalExchange: number;
  wallet: string;
}

export interface PropsType {
  defaultWidgetProps: Partial<ChartingLibraryWidgetOptions>
}

const TvChart: FC<PropsType> = ({ defaultWidgetProps }) => {
  return (
    <>
      {defaultWidgetProps !== undefined
        ? <MemoizedTVChartContainer {...defaultWidgetProps} />
        : 'Chart loading'
      }
    </>
  );
};

export default TvChart;




