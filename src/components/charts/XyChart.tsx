import React, { FC, useEffect, useState, useMemo } from 'react';
import { IReducedToken } from '@pages/portfolio';
import {
  buildChartTheme,
  AnimatedAreaSeries,
  AnimatedAreaStack,
  AnimatedLineSeries,
  Tooltip,
  XYChart,
  darkTheme,
  AnimatedAxis,
  AnimatedGrid,
} from '@visx/xychart';
import { curveCardinal, curveLinear } from '@visx/curve';
import { Box, CircularProgress, Typography, useTheme, useMediaQuery } from '@mui/material';
import { generateGradient } from '@lib/utils/color';
import { GradientOrangeRed, LinearGradient } from '@visx/gradient';
import { Currencies } from '@lib/utils/currencies';

export type XYChartProps = {
  currency: Currencies;
  exchangeRate: number;
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

const XyChart: FC<XYChartProps> = ({ currency, exchangeRate, height, tokenList, areaChart, totalValue }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
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
      xAccessors[token.tokenId] = getDate;
      yAccessors[token.tokenId] = getValue;
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
      console.log(`Processing token: ${token.name}, Amount: ${token.amount}`);

      try {
        const fetchTokenHistory = async (tokenName: string) => {
          const url = `${process.env.CRUX_API}/trading_view/history?symbol=${tokenName.toLowerCase()}&from=${from}&to=${Math.floor(new Date().getTime() / 1000)}&resolution=${resolution}&countback=${countback}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json() as TradingViewHistoryResponse;
        };

        let tokenHistory: TradingViewHistoryResponse;

        if (token.wrappedTokenNames && token.wrappedTokenNames.length > 0) {
          console.log(`${token.name} has wrapped tokens: ${token.wrappedTokenNames.join(', ')}`);
          const wrappedHistories = await Promise.all(token.wrappedTokenNames.map(fetchTokenHistory));
          const validHistories = wrappedHistories.filter(history => history && history.s !== 'no_data');
          const validWeights = token.wrappedTokenAmounts!.filter((_, index) => wrappedHistories[index] && wrappedHistories[index].s !== 'no_data');

          if (validHistories.length > 0) {
            tokenHistory = combineTradingViewResponsesWithWeights(validHistories, validWeights);
          } else {
            console.log(`No valid wrapped histories for ${token.name}`);
            continue;
          }
        } else {
          tokenHistory = await fetchTokenHistory(token.name);
        }

        console.log(`Token history for ${token.name}:`, tokenHistory);

        const isRelevant = isTokenValueRelevant(tokenHistory, token.amount, token.name);
        console.log(`Is ${token.name} relevant? ${isRelevant}`);


        if (isRelevant) {
          results.push({
            ...token,
            history: tokenHistory
          });
        }
      } catch (error) {
        console.error(`Failed to fetch history for ${token.name}:`, error);
      }
    }
    return results;
  };

  const isTokenValueRelevant = (history: TradingViewHistoryResponse, tokenAmount: number, tokenName: string): boolean => {
    if (!history || !history.c || history.c.length === 0) {
      console.log(`Invalid history data for ${tokenName}`);
      return false;
    }

    const values = history.c.map(price => price * tokenAmount);

    // Check if the token was ever worth more than 1 ERG
    const maxValue = Math.max(...values);
    console.log(`${tokenName} - Max value: ${maxValue} ERG, Token Amount: ${tokenAmount}, Max Price: ${Math.max(...history.c)}`);
    return maxValue > 1;
  };

  // This function will combine histories with weights
  const combineTradingViewResponsesWithWeights = (histories: TradingViewHistoryResponse[], weights: number[]) => {
    // Find the shortest 't' array length
    const minLength = Math.min(...histories.map(response => response.t.length));

    // Initialize combined data with zeros
    const combined: TradingViewHistoryResponse = {
      s: "combined",
      t: histories[0].t.slice(0, minLength), // Assuming all `t` arrays have the same starting point
      c: Array(minLength).fill(0),
      o: Array(minLength).fill(0),
      h: Array(minLength).fill(0),
      l: Array(minLength).fill(0),
      v: Array(minLength).fill(0),
    };

    histories.forEach((history, historyIndex) => {
      const weight = weights[historyIndex];
      history.c.forEach((value, idx) => {
        if (value) combined.c[idx] += value * weight;
      });
      // If need to consider other arrays like `o`, `h`, `l`, `v`, add here
    });

    return combined;
  };

  const transformedTokensData = (data: IHistoryResponse[]) => {
    return data.map(tokenData => {
      if (!tokenData.history.t || !tokenData.history.c) {
        throw new Error(`Invalid history data for token ${tokenData.name}`);
      }

      const isWrappedToken = tokenData.wrappedTokenAmounts && tokenData.wrappedTokenAmounts.length > 0;

      const transformedHistory = tokenData.history.t.map((timestamp, index) => ({
        date: new Date(timestamp * 1000),
        value: isWrappedToken
          ? tokenData.history.c[index]
          : tokenData.history.c[index] * tokenData.amount
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
        setLoading(true);
        const historyData = await getHistory(tokenList, from, resolution, 100);
        console.log('Processed history data:', historyData);  // Log 8

        const transformedData = transformedTokensData(historyData);
        console.log('Transformed data:', transformedData);  // Log 9

        // Get all unique dates and fill missing values
        const allDates = getAllUniqueDates(transformedData);
        const filledData = fillMissingValues(transformedData, allDates);
        console.log('Filled data:', filledData);  // Log 10

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

  if (error) return <div>{error}</div>;

  //config
  const dateScaleConfig = {
    type: 'band',
    paddingInner: 0.3
  } as const;
  const valueScaleConfig = { type: 'linear' } as const;

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
    <>
      {loading
        ? (
          <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <CircularProgress size={60} />
            </Box>
            <Typography>
              Loading chart...
            </Typography>
          </Box>
        )
        : (
          <XYChart
            theme={customTheme}
            xScale={dateScaleConfig}
            yScale={valueScaleConfig}
            height={height}
          >
            <AnimatedAxis
              key={`date-axis-min`}
              orientation={'bottom'}
              numTicks={upSm ? 12 : 3}
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
              numTicks={upSm ? 8 : 3}
            />

            {tokenData.map((token, i) => {
              const fillId = `${token.name.split(' ')[0].toLowerCase()}${i}`
              // console.log(`Gradient ${i}: ${fillId}`)
              return (
                <LinearGradient
                  key={fillId}
                  id={fillId}
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
                  const fillId = `${token.name.split(' ')[0].toLowerCase()}${i}`
                  // console.log(`Area ${i}: ${fillId}`)
                  return (
                    <AnimatedAreaSeries
                      key={fillId}
                      dataKey={token.tokenId}
                      data={token.transformedHistory}
                      xAccessor={datum => datum.date}
                      yAccessor={datum => datum.value}
                      fillOpacity={0.8}
                      fill={`url(#${fillId})`}
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
                {tokenData.map((token, i) => {
                  const fillId = `${token.name.split(' ')[0].toLowerCase()}${i}`
                  // console.log(`Line ${i}: ${fillId}`)
                  return (
                    <AnimatedAreaSeries
                      key={fillId}
                      dataKey={token.tokenId}
                      data={token.transformedHistory}
                      xAccessor={datum => datum.date}
                      yAccessor={datum => datum.value}
                      fillOpacity={0.2}
                      fill={`url(#${fillId})`}
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
                  {Object.keys(tooltipData?.datumByKey ?? {}).map((tokenId) => {
                    const datum = tooltipData?.datumByKey[tokenId]?.datum;
                    const value = accessors.y[tokenId](datum);
                    const name = tokenList.filter((item) => item.tokenId === tokenId)[0].name
                    if (value) return (
                      <div key={tokenId}>
                        <em
                          style={{
                            color: colorScale?.(tokenId),
                            textDecoration: tooltipData?.nearestDatum?.key === tokenId ? 'underline' : undefined,
                          }}
                        >
                          {name}
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
        )}
    </>
  );
}

export default XyChart