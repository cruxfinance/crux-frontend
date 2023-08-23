import React, { FC, useEffect, useState, useMemo } from 'react';
import { IReducedToken } from '@src/pages/portfolio';
import {
  buildChartTheme,
  AnimatedAreaSeries,
  AnimatedAreaStack,
  AnimatedLineSeries,
  Tooltip,
  XYChart,
  darkTheme,
  AnimatedAxis,
  AnimatedGrid
} from '@visx/xychart';
import { curveCardinal, curveLinear } from '@visx/curve';
import { useTheme } from '@mui/material';
import { generateGradient } from '@utils/color';
import { GradientOrangeRed, LinearGradient } from '@visx/gradient';

export type XYChartProps = {
  height: number;
  tokenList: IReducedToken[];
  areaChart: boolean;
  totalValue: number;
};

type TradingViewHistoryResponse = {
  s: string;
  t: number[];
  c: number[];
  o: number[];
  h: number[];
  l: number[];
  v: number[];
};

interface IHistoryResponse extends IReducedToken {
  history: TradingViewHistoryResponse
}

interface ITransformedResponses extends IHistoryResponse {
  transformedHistory: {
    date: Date;
    value: number | null;
  }[];
}

type AccessorFunction = (datum: any) => any;
type Accessors = {
  x: { [key: string]: AccessorFunction };
  y: { [key: string]: AccessorFunction };
  date: AccessorFunction;
};

const XyChart: FC<XYChartProps> = ({ height, tokenList, areaChart, totalValue }) => {
  const [tokenData, setTokenData] = useState<ITransformedResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const resolution = '1W'
  const from = 1660198189

  const getDate = (d: { date: Date; value: number | null }) => d.date;
  const getValue = (d: { date: Date; value: number | null }) => d.value;

  const accessors: Accessors = useMemo(() => {
    const xAccessors: { [key: string]: (datum: any) => any } = {};
    const yAccessors: { [key: string]: (datum: any) => any } = {};

    tokenData.forEach(token => {
      xAccessors[token.name] = getDate;
      yAccessors[token.name] = getValue;
    });

    return {
      x: xAccessors,
      y: yAccessors,
      date: getDate,
    };
  }, [tokenData]);

  const getAllUniqueDates = (data: ITransformedResponses[]) => {
    const allDates: Date[] = [];
    data.forEach(token => {
      token.transformedHistory.forEach(item => {
        if (!allDates.some(date => date.getTime() === item.date.getTime())) {
          allDates.push(item.date);
        }
      });
    });
    return allDates.sort((a, b) => a.getTime() - b.getTime());
  };

  const fillMissingValues = (data: ITransformedResponses[], allDates: Date[]) => {
    return data.map(token => {
      const filledData = allDates.map(date => {
        const existingData = token.transformedHistory.find(item => item.date.getTime() === date.getTime());
        return existingData || { date, value: null };
      });
      return {
        ...token,
        transformedHistory: filledData
      };
    });
  };

  // Filter out series with max value less than 1% of total portfolio value
  const filterRelevantSeries = (data: ITransformedResponses[], totalValue: number) => {
    return data.filter(token => {
      const maxValue = Math.max(...token.transformedHistory.map(item => item.value !== null ? item.value : 0));
      return maxValue >= 0.01 * totalValue;  // Check if max value is at least 1% of totalValue
    });
  };

  const getHistory = async (tokens: IReducedToken[], from: number, resolution: string, countback: number) => {
    const results = [];
    for (const token of tokens) {
      const url = `${process.env.CRUX_API}/trading_view/history?symbol=${token.name.toLowerCase()}&from=${from}&to=${Math.floor(new Date().getTime() / 1000)}&resolution=${resolution}&countback=${countback}`
      console.log('request url: ' + url)
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch history for token ${token.name}. Status: ${response.status} ${response.statusText}`);
      }

      const data: TradingViewHistoryResponse = await response.json();
      results.push({
        ...token,
        history: data
      });
    }
    return results;
  };

  const transformedTokensData = (data: IHistoryResponse[]) => {
    return data.map(tokenData => {
      if (!tokenData.history.t || !tokenData.history.c) {
        throw new Error(`Invalid history data for token ${tokenData.name}`);
      }

      const transformedHistory = tokenData.history.t.map((timestamp, index) => ({
        date: new Date(timestamp * 1000),
        value: tokenData.history.c[index] * tokenData.amount,
      }));
      return {
        ...tokenData,
        transformedHistory
      };
    });
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyData = await getHistory(tokenList, from, resolution, 100);
        const transformedData = transformedTokensData(historyData);

        // Get all unique dates and fill missing values
        const allDates = getAllUniqueDates(transformedData);
        const filledData = fillMissingValues(transformedData, allDates);

        // Filter out series with max value less than 1% of total portfolio value
        const relevantData = filterRelevantSeries(filledData, totalValue);

        setTokenData(relevantData);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Error occurred: ${err.message}`);
          console.error(err);
        } else {
          setError('An unexpected error occurred.');
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenList]);

  if (error) return <div>Error: unable to load chart. Please contact support via Discord or Telegram. </div>;

  //config
  const dateScaleConfig = {
    type: 'band',
    paddingInner: 0.3
  } as const;
  const valueScaleConfig = { type: 'linear' } as const;

  const theme = useTheme()
  const customTheme = buildChartTheme({
    // colors
    backgroundColor: theme.palette.background.paper, // used by Tooltip, Annotation
    colors: generateGradient(tokenData.length), // categorical colors, mapped to series via `dataKey`s

    // labels
    // svgLabelBig?: SVGTextProps;
    // svgLabelSmall?: SVGTextProps;
    // htmlLabel?: HTMLTextStyles;

    // lines
    // xAxisLineStyles?: LineStyles;
    // yAxisLineStyles?: LineStyles;
    // xTickLineStyles?: LineStyles;
    // yTickLineStyles?: LineStyles;
    tickLength: 1,

    // grid
    gridColor: theme.palette.divider,
    gridColorDark: theme.palette.text.secondary // used for axis baseline if x/yxAxisLineStyles not set
    // gridStyles?: CSSProperties;
  });

  return (
    <XYChart
      theme={customTheme}
      xScale={dateScaleConfig}
      yScale={valueScaleConfig}
      height={height}
    >
      <AnimatedAxis
        key={`date-axis-min`}
        orientation={'bottom'}
        numTicks={12}
        animationTrajectory={'min'}
        tickFormat={(date) => date.toLocaleDateString()}
      />
      <AnimatedAxis
        key={`value-axis-min`}
        // label={'Value'}
        orientation={'left'}
        numTicks={4}
        animationTrajectory={'min'}
        hideAxisLine
      // tickFormat={}
      />
      <AnimatedGrid
        key={`grid-min`} // force animate on update
        rows={true}
        columns={true}
        animationTrajectory={'min'}
        numTicks={8}
      />

      {tokenData.map((item, i) => {
        const idString = `stacked-area-${item.name}`
        return (
          <LinearGradient
            key={idString}
            id={idString}
            to={customTheme.colors[i]}
            from={customTheme.colors[i]}
            fromOpacity={1}
            toOpacity={0.2}
            rotate="12"
          />
        )
      }
      )}
      {areaChart && (
        <AnimatedAreaStack curve={curveLinear} offset='none' renderLine={true}>
          {tokenData.map((token, i) => {
            const idString = `stacked-area-${token.name}`
            return (
              <AnimatedAreaSeries
                key={idString}
                dataKey={token.name}
                data={token.transformedHistory}
                xAccessor={datum => datum.date}
                yAccessor={datum => datum.value}
                // fillOpacity={1}
                fill={`url(#${idString})`}
              />
            )
          }
          )}
        </AnimatedAreaStack>
      )}
      {!areaChart && (
        <>
          {/* {tokenData.map(token => (
            <AnimatedLineSeries
              key={token.name}
              dataKey={token.name}
              data={token.transformedHistory}
              xAccessor={datum => datum.date}
              yAccessor={datum => datum.value}
              curve={curveLinear}
            />
          ))} */}
          {tokenData.map(token => {
            const idString = `stacked-area-${token.name}`
            return (
              <AnimatedAreaSeries
                key={token.name}
                dataKey={token.name}
                data={token.transformedHistory}
                xAccessor={datum => datum.date}
                yAccessor={datum => datum.value}
                fillOpacity={1}
                fill={`url(#${idString})`}
              />
            )
          })}
        </>
      )}

      <Tooltip<Accessors>
        showHorizontalCrosshair={false}
        showVerticalCrosshair={true}
        snapTooltipToDatumX={areaChart ? true : false}
        snapTooltipToDatumY={false}
        showSeriesGlyphs={true}
        renderTooltip={({ tooltipData, colorScale }) => (
          <>
            {(tooltipData?.nearestDatum?.datum &&
              new Date(accessors.date(tooltipData?.nearestDatum?.datum)).toLocaleDateString()) ||
              'No date'}
            <br />
            <br />
            {Object.keys(tooltipData?.datumByKey ?? {}).map((tokenName) => {
              const datum = tooltipData?.datumByKey[tokenName]?.datum;
              const value = accessors.y[tokenName](datum);
              if (value) return (
                <div key={tokenName}>
                  <em
                    style={{
                      color: colorScale?.(tokenName),
                      textDecoration: tooltipData?.nearestDatum?.key === tokenName ? 'underline' : undefined,
                    }}
                  >
                    {tokenName}
                  </em>{' '}
                  {/* Display the value of the series */}
                  {value.toFixed(2)}
                </div>
              );
            })}
          </>
        )}
      />
    </XYChart>

  );
}

export default XyChart