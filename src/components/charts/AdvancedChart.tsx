import styles from "./index.module.css";
import { FC, useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  IChartWidgetApi,
  LanguageCode,
  ResolutionString,
  widget,
} from "@lib/charts/charting_library";
import { UDFCompatibleDatafeed } from "@lib/charts/datafeeds/udf/src/udf-compatible-datafeed";
import { useTheme, useMediaQuery } from "@mui/material";

interface TVProps {
  defaultWidgetProps: Partial<ChartingLibraryWidgetOptions>;
  currency: string;
  height?: string;
  onChartReady?: (chart: IChartWidgetApi, container: HTMLElement) => void;
}

export const TVChartContainer: FC<TVProps> = ({
  defaultWidgetProps,
  currency,
  height,
  onChartReady,
}) => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));

  const chartContainerRef =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;

  const disabledFeatures = upSm
    ? ["header_symbol_search"]
    : ["header_symbol_search", "left_toolbar"];

  useEffect(() => {
    const savedSettings = localStorage.getItem("chartSettings");
    let initialSettings = {};
    if (savedSettings) {
      initialSettings = JSON.parse(savedSettings);
    }

    const bgColor = theme.palette.background.default;

    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol:
        currency === "USE"
          ? `${defaultWidgetProps.symbol}_usd`
          : defaultWidgetProps.symbol,
      interval: defaultWidgetProps.interval as ResolutionString,
      datafeed: new UDFCompatibleDatafeed(
        `${process.env.CRUX_API}/trading_view`,
      ),
      container: chartContainerRef.current,
      library_path: defaultWidgetProps.library_path,
      locale: defaultWidgetProps.locale as LanguageCode,
      // @ts-ignore
      disabled_features: disabledFeatures,
      fullscreen: defaultWidgetProps.fullscreen,
      autosize: defaultWidgetProps.autosize,
      theme: "dark",
      overrides: {
        "paneProperties.background": bgColor,
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "rgba(120,150,150,0.06)",
        "paneProperties.horzGridProperties.color": "rgba(120,150,150,0.06)",
      },
      loading_screen: { backgroundColor: bgColor },
    };

    const mergedWidgetOptions = {
      ...widgetOptions, // Default widget options
      ...initialSettings, // Override with saved settings
    };

    const tvWidget = new widget(mergedWidgetOptions);

    tvWidget.onChartReady(() => {
      const chart = tvWidget.activeChart();

      // Restore persisted chart state (drawings, indicators) for this symbol
      const stateKey = `chartState_${widgetOptions.symbol}`;
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        try {
          tvWidget.load(JSON.parse(savedState));
        } catch (e) {
          console.error("Failed to load chart state:", e);
          localStorage.removeItem(stateKey);
        }
      }

      // Always clean up Volume studies and ensure exactly one exists
      const studies = chart.getAllStudies();
      const volumeStudies = studies.filter((s) => s.name === "Volume");
      volumeStudies.forEach((study) => {
        chart.removeEntity(study.id);
      });
      chart.createStudy('Volume', true, false);

      // Capture changes in settings and persist chart state
      chart.onIntervalChanged().subscribe(null, () => {
        updateChartSettings(chart);
      });
      chart.onVisibleRangeChanged().subscribe(null, () => {
        updateChartSettings(chart);
      });

      function updateChartSettings(chart: IChartWidgetApi) {
        const currentSettings = {
          interval: chart.resolution(),
          timeframe: chart.getVisibleRange(),
        };
        localStorage.setItem("chartSettings", JSON.stringify(currentSettings));
        // Persist full chart state (drawings, indicators) per symbol
        tvWidget.save((state: object) => {
          localStorage.setItem(stateKey, JSON.stringify(state));
        });
      }

      // Expose chart to parent
      if (onChartReady) {
        onChartReady(chart, chartContainerRef.current);
      }
    });

    return () => {
      // Best-effort save before destruction
      try {
        const stateKey = `chartState_${widgetOptions.symbol}`;
        tvWidget.save((state: object) => {
          localStorage.setItem(stateKey, JSON.stringify(state));
        });
      } catch {}
      tvWidget.remove();
    };
  }, [defaultWidgetProps, currency]);

  return (
    <>
      <div
        ref={chartContainerRef}
        className={styles.TVChartContainer}
        style={{ height: height ? height : "80vh" }}
      />
    </>
  );
};
