/* eslint-disable jsx-a11y/accessible-emoji */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useCallback, useMemo, useState } from 'react';
import { lightTheme, darkTheme, XYChartTheme } from '@visx/xychart';
import { AnimationTrajectory } from '@visx/react-spring/lib/types';
import { GlyphCross, GlyphDot, GlyphStar } from '@visx/glyph';
import { curveLinear, curveStep, curveCardinal } from '@visx/curve';
import { RenderTooltipGlyphProps } from '@visx/xychart/lib/components/Tooltip';
import customTheme from './customTheme';
import getAnimatedOrUnanimatedComponents from './getAnimatedOrUnanimatedComponents';
import { IReducedToken } from '@src/pages/portfolio';

function userPrefersReducedMotion() {
  const prefersReducedMotionQuery =
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)');
  return !prefersReducedMotionQuery || !!prefersReducedMotionQuery.matches;
}

const dateScaleConfig = { type: 'band', paddingInner: 0.3 } as const;
const temperatureScaleConfig = { type: 'linear' } as const;
const numTicks = 4;
const defaultAnnotationDataIndex = 13;
const selectedDatumPatternId = 'xychart-selected-datum';

type SimpleScaleConfig = { type: 'band' | 'linear'; paddingInner?: number };

type ProvidedProps = {
  animationTrajectory?: AnimationTrajectory;
  config: {
    x: SimpleScaleConfig;
    y: SimpleScaleConfig;
  };
  curve: typeof curveLinear | typeof curveCardinal | typeof curveStep;
  editAnnotationLabelPosition: boolean;
  numTicks: number;
  renderAreaSeries: boolean;
  renderAreaStack: boolean;
  enableTooltipGlyph: boolean;
  renderHorizontally: boolean;
  renderLineSeries: boolean;
  sharedTooltip: boolean;
  showGridColumns: boolean;
  showGridRows: boolean;
  showHorizontalCrosshair: boolean;
  showTooltip: boolean;
  showVerticalCrosshair: boolean;
  snapTooltipToDatumX: boolean;
  snapTooltipToDatumY: boolean;
  stackOffset?: 'wiggle' | 'expand' | 'diverging' | 'silhouette';
  theme: XYChartTheme;
  xAxisOrientation: 'top' | 'bottom';
  yAxisOrientation: 'left' | 'right';
} & ReturnType<typeof getAnimatedOrUnanimatedComponents>;

type ControlsProps = {
  children: (props: ProvidedProps) => React.ReactNode;
  tokenList: IReducedToken[];
};

export default function ExampleControls({ children, tokenList }: ControlsProps) {
  const [useAnimatedComponents, setUseAnimatedComponents] = useState(!userPrefersReducedMotion());
  const [theme, setTheme] = useState<XYChartTheme>(darkTheme);
  const [animationTrajectory, setAnimationTrajectory] = useState<AnimationTrajectory | undefined>(
    'center',
  );
  const [gridProps, setGridProps] = useState<[boolean, boolean]>([false, false]);
  const [showGridRows, showGridColumns] = gridProps;
  const [xAxisOrientation, setXAxisOrientation] = useState<'top' | 'bottom'>('bottom');
  const [yAxisOrientation, setYAxisOrientation] = useState<'left' | 'right'>('right');
  const [renderHorizontally, setRenderHorizontally] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showVerticalCrosshair, setShowVerticalCrosshair] = useState(true);
  const [showHorizontalCrosshair, setShowHorizontalCrosshair] = useState(false);
  const [snapTooltipToDatumX, setSnapTooltipToDatumX] = useState(true);
  const [snapTooltipToDatumY, setSnapTooltipToDatumY] = useState(true);
  const sharedTooltip = false
  const [renderBarStackOrGroup, setRenderBarStackOrGroup] = useState<
    'bar' | 'barstack' | 'bargroup' | 'none'
  >('none');
  const [renderAreaLineOrStack, setRenderAreaLineOrStack] = useState<
    'line' | 'area' | 'areastack' | 'none'
  >('areastack');
  const [stackOffset, setStackOffset] = useState<ProvidedProps['stackOffset']>();
  const [editAnnotationLabelPosition, setEditAnnotationLabelPosition] = useState(false);
  const [annotationLabelPosition, setAnnotationLabelPosition] = useState({ dx: -40, dy: -20 });
  const [annotationDataIndex, setAnnotationDataIndex] = useState(defaultAnnotationDataIndex);
  const [negativeValues, setNegativeValues] = useState(false);
  const [fewerDatum, setFewerDatum] = useState(false);
  const [missingValues, setMissingValues] = useState(false);
  const [curveType, setCurveType] = useState<'linear' | 'cardinal' | 'step'>('linear');
  const glyphOutline = theme.gridStyles.stroke;
  const [enableTooltipGlyph, setEnableTooltipGlyph] = useState(false);
  const [tooltipGlyphComponent, setTooltipGlyphComponent] = useState<
    'star' | 'cross' | 'circle' | '🍍'
  >('star');

  const config = useMemo(
    () => ({
      x: dateScaleConfig,
      y: temperatureScaleConfig,
    }),
    [],
  );

  // cannot snap to a stack position
  const canSnapTooltipToDatum =
    renderBarStackOrGroup !== 'barstack' && renderAreaLineOrStack !== 'areastack';

  return (
    <>
      {children({
        animationTrajectory,
        config,
        curve:
          (curveType === 'cardinal' && curveCardinal) ||
          (curveType === 'step' && curveStep) ||
          curveLinear,
        editAnnotationLabelPosition,
        numTicks,
        enableTooltipGlyph,
        renderHorizontally,
        renderAreaSeries: renderAreaLineOrStack === 'area',
        renderAreaStack: renderAreaLineOrStack === 'areastack',
        renderLineSeries: renderAreaLineOrStack === 'line',
        sharedTooltip,
        showGridColumns,
        showGridRows,
        showHorizontalCrosshair,
        showTooltip,
        showVerticalCrosshair,
        snapTooltipToDatumX: canSnapTooltipToDatum && snapTooltipToDatumX,
        snapTooltipToDatumY: canSnapTooltipToDatum && snapTooltipToDatumY,
        stackOffset,
        theme,
        xAxisOrientation,
        yAxisOrientation,
        ...getAnimatedOrUnanimatedComponents(useAnimatedComponents),
      })}
      <div className="controls" style={{ marginTop: '-300px' }}>
        {/** tokenList */}
        <div>
          <strong>tokenList</strong>
          <label>
            <input
              type="checkbox"
              onChange={() => setNegativeValues(!negativeValues)}
              checked={negativeValues}
            />
            negative values (SF)
          </label>
          <label>
            <input
              type="checkbox"
              onChange={() => setMissingValues(!missingValues)}
              checked={missingValues}
            />
            missing values
          </label>
          <label>
            <input
              type="checkbox"
              onChange={() => setFewerDatum(!fewerDatum)}
              checked={fewerDatum}
            />
            fewer datum
          </label>
        </div>

        {/** theme */}
        <div>
          <strong>theme</strong>
          <label>
            <input
              type="radio"
              onChange={() => setTheme(lightTheme)}
              checked={theme === lightTheme}
            />
            light
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setTheme(darkTheme)}
              checked={theme === darkTheme}
            />
            dark
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setTheme(customTheme)}
              checked={theme === customTheme}
            />
            custom
          </label>
        </div>

        <br />

        <div>
          <strong>line series</strong>
          <label>
            <input
              type="radio"
              onChange={() => {
                if (renderBarStackOrGroup === 'barstack' || renderBarStackOrGroup === 'bargroup') {
                  setRenderBarStackOrGroup('none');
                }
                setRenderAreaLineOrStack('line');
              }}
              checked={renderAreaLineOrStack === 'line'}
            />
            line
          </label>
          <label>
            <input
              type="radio"
              onChange={() => {
                setRenderBarStackOrGroup('none');
                setRenderAreaLineOrStack('areastack');
              }}
              checked={renderAreaLineOrStack === 'areastack'}
            />
            area stack
          </label>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <strong>curve shape</strong>
          <label>
            <input
              type="radio"
              disabled={renderAreaLineOrStack === 'none'}
              onChange={() => setCurveType('linear')}
              checked={curveType === 'linear'}
            />
            linear
          </label>
          <label>
            <input
              type="radio"
              disabled={renderAreaLineOrStack === 'none'}
              onChange={() => setCurveType('cardinal')}
              checked={curveType === 'cardinal'}
            />
            cardinal (smooth)
          </label>
          <label>
            <input
              type="radio"
              disabled={renderAreaLineOrStack === 'none'}
              onChange={() => setCurveType('step')}
              checked={curveType === 'step'}
            />
            step
          </label>
        </div>
        <br />

        {/** axes */}
        <div>
          <strong>axes</strong>
          <label>
            <input
              type="radio"
              onChange={() => setXAxisOrientation('bottom')}
              checked={xAxisOrientation === 'bottom'}
            />
            bottom
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setXAxisOrientation('top')}
              checked={xAxisOrientation === 'top'}
            />
            top
          </label>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <label>
            <input
              type="radio"
              onChange={() => setYAxisOrientation('left')}
              checked={yAxisOrientation === 'left'}
            />
            left
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setYAxisOrientation('right')}
              checked={yAxisOrientation === 'right'}
            />
            right
          </label>
        </div>

        {/** grid */}
        <div>
          <strong>grid</strong>
          <label>
            <input
              type="radio"
              onChange={() => setGridProps([true, false])}
              checked={showGridRows && !showGridColumns}
            />
            rows
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setGridProps([false, true])}
              checked={!showGridRows && showGridColumns}
            />
            columns
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setGridProps([true, true])}
              checked={showGridRows && showGridColumns}
            />
            both
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setGridProps([false, false])}
              checked={!showGridRows && !showGridColumns}
            />
            none
          </label>
        </div>
        {/** animation trajectory */}
        <div>
          <label>
            <input
              type="checkbox"
              onChange={() => setUseAnimatedComponents(!useAnimatedComponents)}
              checked={useAnimatedComponents}
            />
            use animated components
          </label>


          <strong>axis + grid animation</strong>
          <label>
            <input
              type="radio"
              onChange={() => setAnimationTrajectory('center')}
              checked={animationTrajectory === 'center'}
            />
            from center
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setAnimationTrajectory('outside')}
              checked={animationTrajectory === 'outside'}
            />
            from outside
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setAnimationTrajectory('min')}
              checked={animationTrajectory === 'min'}
            />
            from min
          </label>
          <label>
            <input
              type="radio"
              onChange={() => setAnimationTrajectory('max')}
              checked={animationTrajectory === 'max'}
            />
            from max
          </label>

        </div>
      </div>
      <style jsx>{`
        .controls {
          font-size: 13px;
          line-height: 1.5em;
        }
        .controls > div {
          margin-bottom: 4px;
        }
        label {
          font-size: 12px;
        }
        input[type='radio'] {
          height: 10px;
        }
        .pattern-lines {
          position: absolute;
          pointer-events: none;
          opacity: 0;
        }
      `}</style>
    </>
  );
}
