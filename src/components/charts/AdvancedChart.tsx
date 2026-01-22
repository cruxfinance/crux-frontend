import styles from "./index.module.css";
import { FC, useEffect, useRef, useCallback } from "react";
import { debounce } from "lodash";
import {
  ChartingLibraryWidgetOptions,
  IChartWidgetApi,
  LanguageCode,
  ResolutionString,
  widget,
} from "@lib/charts/charting_library";
import { UDFCompatibleDatafeed } from "@lib/charts/datafeeds/udf/src/udf-compatible-datafeed";
import { useTheme, useMediaQuery } from "@mui/material";
import {
  createTradeMarkerManager,
  TradeMarkerManager,
} from "@lib/charts/tradeMarkers";

interface TVProps {
  defaultWidgetProps: Partial<ChartingLibraryWidgetOptions>;
  currency: string;
  height?: string;
  userAddresses?: string[];
  tokenId?: string;
  showUserTrades?: boolean;
}

export const TVChartContainer: FC<TVProps> = ({
  defaultWidgetProps,
  currency,
  height,
  userAddresses,
  tokenId,
  showUserTrades,
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
      // charts_storage_url: defaultWidgetProps.charts_storage_url,
      // charts_storage_api_version: defaultWidgetProps.charts_storage_api_version,
      // client_id: defaultWidgetProps.client_id,
      // user_id: defaultWidgetProps.user_id,
      fullscreen: defaultWidgetProps.fullscreen,
      autosize: defaultWidgetProps.autosize,
      theme: "dark",
      // debug: true
    };

    const mergedWidgetOptions = {
      ...widgetOptions, // Default widget options
      ...initialSettings, // Override with saved settings
    };

    const tvWidget = new widget(mergedWidgetOptions);
    let tradeMarkerManager: TradeMarkerManager | null = null;

    tvWidget.onChartReady(() => {
      const chart = tvWidget.activeChart();

      // Remove default volume from the main pane
      const studies = chart.getAllStudies();
      studies.forEach((study) => {
        if (study.name === "Volume") {
          chart.removeEntity(study.id);
        }
      });

      // Add volume as indicator
      chart.createStudy("Volume", true, false);

      // Initialize trade markers if user is authenticated
      if (
        showUserTrades &&
        userAddresses &&
        userAddresses.length > 0 &&
        tokenId &&
        chartContainerRef.current
      ) {
        tradeMarkerManager = createTradeMarkerManager(
          chart,
          tokenId,
          userAddresses,
          chartContainerRef.current,
        );

        // Load initial markers for visible range
        const visibleRange = chart.getVisibleRange();
        tradeMarkerManager.loadMarkers(visibleRange.from, visibleRange.to);

        // Debounced marker loader to avoid excessive API calls during pan/zoom
        const debouncedLoadMarkers = debounce((from: number, to: number) => {
          if (tradeMarkerManager) {
            tradeMarkerManager.loadMarkers(from, to);
          }
        }, 300);

        // Subscribe to visible range changes to refresh markers
        chart.onVisibleRangeChanged().subscribe(null, (range) => {
          debouncedLoadMarkers(range.from, range.to);
        });
      }

      // Capture changes in settings
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
      }
    });

    return () => {
      if (tradeMarkerManager) {
        tradeMarkerManager.destroy();
      }
      tvWidget.remove();
    };
  }, [defaultWidgetProps, currency, userAddresses, tokenId, showUserTrades]);

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
