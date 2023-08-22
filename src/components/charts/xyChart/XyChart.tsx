import React, { FC, useEffect, useState, useMemo } from 'react';
import { IReducedToken } from '@src/pages/portfolio';

import ExampleControls from './ExampleControls';

export type XYChartProps = {
  height: number;
  tokenList: IReducedToken[];
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
    value: number;
  }[];
}

type AccessorFunction = (datum: any) => any;
type Accessors = {
  x: { [key: string]: AccessorFunction };
  y: { [key: string]: AccessorFunction };
  date: AccessorFunction;
};

const XyChart: FC<XYChartProps> = ({ height, tokenList }) => {
  const [tokenData, setTokenData] = useState<ITransformedResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [lineOrArea, setLineOrArea] = useState('line')

  const resolution = '1W'
  const from = 1660198189

  const getDate = (d: { date: Date; value: number }) => d.date;
  const getValue = (d: { date: Date; value: number }) => d.value;

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

  const getHistory = (tokens: IReducedToken[], from: number, resolution: string, countback: number) => {
    return tokens.map(async (token) => {
      // change token.name to token.tokenId when the API gets changed
      const response = await fetch(`https://api.cruxfinance.io/trading_view/history?symbol=${token.name.toLowerCase()}&from=${from}&to=${Math.floor(new Date().getTime() / 1000)}&resolution=${resolution}&countback=${countback}`);
      const data: TradingViewHistoryResponse = await response.json();
      return {
        ...token,
        history: data
      };
    })
  };

  const transformedTokensData = (data: IHistoryResponse[]) => {
    return data.map(tokenData => {
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
        const historyDataPromises = getHistory(tokenList, from, resolution, 100);
        const historyData = await Promise.all(historyDataPromises)
        const transformedData = transformedTokensData(historyData);
        setTokenData(transformedData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenList]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ExampleControls tokenList={tokenData}>
      {({
        animationTrajectory,
        config,
        curve,
        editAnnotationLabelPosition,
        numTicks,
        showGridColumns,
        showGridRows,
        stackOffset,
        theme,
        xAxisOrientation,
        yAxisOrientation,

        // components are animated or not depending on selection
        AreaSeries,
        AreaStack,
        Axis,
        Grid,
        LineSeries,
        Tooltip,
        XYChart,
      }) => (
        <XYChart
          theme={theme}
          xScale={config.x}
          yScale={config.y}
          height={height}
          captureEvents={!editAnnotationLabelPosition}
        >
          <Grid
            key={`grid-${animationTrajectory}`} // force animate on update
            rows={showGridRows}
            columns={showGridColumns}
            animationTrajectory={animationTrajectory}
            numTicks={numTicks}
          />
          {lineOrArea === 'area' && (
            <AreaStack curve={curve} offset={stackOffset} renderLine={stackOffset !== 'wiggle'}>
              {tokenData.map(token => (
                <AreaSeries
                  key={token.name}
                  dataKey={token.name}
                  data={token.transformedHistory}
                  xAccessor={datum => datum.date}
                  yAccessor={datum => datum.value}
                  fillOpacity={0.4}
                />
              ))}
            </AreaStack>
          )}
          {lineOrArea === 'line' && (
            <>
              {tokenData.map(token => (
                <LineSeries
                  key={token.name}
                  dataKey={token.name}
                  data={token.transformedHistory}
                  xAccessor={datum => datum.date}
                  yAccessor={datum => datum.value}
                  curve={curve}
                />
              ))}
            </>
          )}
          <Axis
            key={`time-axis-${animationTrajectory}`}
            orientation={xAxisOrientation}
            numTicks={numTicks}
            animationTrajectory={animationTrajectory}
          />
          <Axis
            key={`value-axis-${animationTrajectory}`}
            label={
              stackOffset == null
                ? 'Value'
                : stackOffset === 'expand'
                  ? 'Fraction of total value'
                  : ''
            }
            orientation={yAxisOrientation}
            numTicks={numTicks}
            animationTrajectory={animationTrajectory}
            // values don't make sense in stream graph
            tickFormat={stackOffset === 'wiggle' ? () => '' : undefined}
          />

          <Tooltip<Accessors>
            showHorizontalCrosshair={false}
            showVerticalCrosshair={true}
            snapTooltipToDatumX={true}
            snapTooltipToDatumY={true}
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
                  if (datum) {
                    const value = accessors.y[tokenName](datum);
                    // Check if the value is valid before displaying it
                    if (value !== null && !Number.isNaN(value) && value !== 0) {
                      return (
                        <div key={tokenName}>
                          <em
                            style={{
                              color: colorScale?.(tokenName),
                              textDecoration: tooltipData?.nearestDatum?.key === tokenName ? 'underline' : undefined,
                            }}
                          >
                            {tokenName}
                          </em>{' '}
                          {`${value.toFixed(2)}`}
                        </div>
                      );
                    }
                  }
                  return null;
                })}

                {/* 
                {([tooltipData?.nearestDatum?.key]).map((tokenName) => {
                  if (tokenName) {
                    const value = tooltipData?.nearestDatum?.datum && accessors['y'][tokenName](tooltipData?.nearestDatum?.datum);

                    return (
                      <div key={tokenName}>
                        <em
                          style={{
                            color: colorScale?.(tokenName),
                            textDecoration: tooltipData?.nearestDatum?.key === tokenName ? 'underline' : undefined,
                          }}
                        >
                          {tokenName}
                        </em>{' '}
                        {value == null || Number.isNaN(value)
                          ? '-'
                          : `${value.toFixed(2)}`}
                      </div>
                    );
                  }
                })} 
                */}
              </>
            )}
          />

        </XYChart>
      )}
    </ExampleControls>
  );
}

export default XyChart