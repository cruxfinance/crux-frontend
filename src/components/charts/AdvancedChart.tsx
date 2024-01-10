import styles from "./index.module.css";
import { useEffect, useRef } from "react";
import { ChartingLibraryWidgetOptions, LanguageCode, ResolutionString, widget } from "@lib/charts/charting_library";
import { UDFCompatibleDatafeed } from "@lib/charts/datafeeds/udf/src/udf-compatible-datafeed";
import { useTheme, useMediaQuery } from "@mui/material";

export const TVChartContainer = (props: Partial<ChartingLibraryWidgetOptions>) => {
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));

  const chartContainerRef =
    useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;
  const disabledFeatures = upSm
    ? ["header_symbol_search"]
    : ["header_symbol_search", "left_toolbar"]
  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: props.symbol,
      interval: props.interval as ResolutionString,
      datafeed: new UDFCompatibleDatafeed(`${process.env.CRUX_API}/trading_view`),
      container: chartContainerRef.current,
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
      // @ts-ignore
      disabled_features: disabledFeatures,
      // charts_storage_url: props.charts_storage_url,
      // charts_storage_api_version: props.charts_storage_api_version,
      // client_id: props.client_id,
      // user_id: props.user_id,
      fullscreen: props.fullscreen,
      autosize: props.autosize,
      theme: 'dark',
      debug: true
    };

    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(() => {
      const chart = tvWidget.activeChart();

      // Remove default volume from the main pane
      const studies = chart.getAllStudies();
      studies.forEach(study => {
        if (study.name === "Volume") {
          chart.removeEntity(study.id);
        }
      });

      // Add volume to a separate pane
      chart.createStudy('Volume', false, true);

      // tvWidget.headerReady().then(() => {
      //   const button = tvWidget.createButton();
      //   button.setAttribute("title", "Click to show a notification popup");
      //   button.classList.add("apply-common-tooltip");
      //   button.addEventListener("click", () =>
      //     tvWidget.showNoticeDialog({
      //       title: "Notification",
      //       body: "TradingView Charting Library API works correctly",
      //       callback: () => {
      //         console.log("Noticed!");
      //       },
      //     })
      //   );

      //   button.innerHTML = "Check API";
      // });
    });

    // return () => {
    //   tvWidget.remove();
    // };
  }, [props]);

  return (
    <>
      <div ref={chartContainerRef} className={styles.TVChartContainer} style={{ height: '80vh' }} />
    </>
  );
};