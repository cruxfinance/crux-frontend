import React, { FC } from 'react';
import {
  ChartingLibraryWidgetOptions,
} from "@lib/charts/charting_library";
import { TVChartContainer } from '@components/charts/AdvancedChart';

export interface PropsType {
  defaultWidgetProps: Partial<ChartingLibraryWidgetOptions>
  currency: string;
}

const MemoizedTVChartContainer = React.memo(TVChartContainer);

const TvChart: FC<PropsType> = ({ defaultWidgetProps, currency }) => {
  return (
    <>
      {defaultWidgetProps !== undefined
        ? <MemoizedTVChartContainer defaultWidgetProps={defaultWidgetProps} currency={currency} />
        : 'Chart loading'
      }
    </>
  );
};

export default TvChart;
