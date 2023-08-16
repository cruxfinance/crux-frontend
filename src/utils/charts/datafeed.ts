import { ErrorCallback, HistoryCallback, LibrarySymbolInfo, ResolutionString, ResolveCallback, SeriesFormat, SymbolResolveExtension, Timezone, VisiblePlotsSet } from '@public/static/charting_library/datafeed-api.js';
import { makeApiRequest } from './helpers';

const configurationData = {
  supported_resolutions: ['60', '240', 'D', 'W'],
  exchanges: [
    { value: 'spectrum', name: 'Spectrum Finance', desc: 'Spectrum Finance' },
  ],
  symbols_types: [
    { name: 'crypto', value: 'crypto' }
  ]
};

export default {
  onReady: (callback: any) => {
    console.log('[onReady]: Method call');
    setTimeout(() => callback(configurationData));
  },
  searchSymbols: (userInput: any, exchange: any, symbolType: any, onResultReadyCallback: any) => {
    console.log('[searchSymbols]: Method call');
  },
  resolveSymbol: (
    symbolName: string,
    onSymbolResolvedCallback: ResolveCallback,
    onResolveErrorCallback: ErrorCallback,
    extension?: SymbolResolveExtension
  ) => {
    console.log('[resolveSymbol]: Method call', symbolName);

    const symbolInfo = {
      ticker: symbolName,
      name: symbolName,
      full_name: 'ERGOPAD',
      description: symbolName,
      type: 'crypto',
      session: '24x7',
      exchange: 'Spectrum Finance',
      listed_exchange: 'SPF',
      timezone: 'Etc/UTC' as Timezone,
      format: 'price' as SeriesFormat,
      minmov: 1,
      pricescale: 100000,
      has_intraday: true,
      visible_plots_set: 'ohlc' as VisiblePlotsSet,
      has_weekly_and_monthly: true,
      supported_resolutions: configurationData.supported_resolutions as ResolutionString[],
      volume_precision: 2
    };

    console.log('[resolveSymbol]: Symbol resolved', symbolName);
    onSymbolResolvedCallback(symbolInfo);
  },
  getBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: { from: any; to: any; },
    onHistoryCallback: HistoryCallback,
    // onError: ErrorCallback,
    // firstDataRequest: boolean,
    onErrorCallback: (arg0: string) => void
  ) => {
    // const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    // if (!parsedSymbol) {
    //   onErrorCallback("Cannot parse symbol");
    //   return;
    // }

    const { from, to } = periodParams;
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);

    if (resolution !== '1W') {
      // End condition: If the library requests data before December 2021
      if (fromDate < new Date('2021-12-15')) {
        onHistoryCallback([], { noData: true });
        return;
      }
    }
    else {
      if (fromDate < new Date('2015-12-15')) {
        onHistoryCallback([], { noData: true });
        return;
      }
    }


    // Convert resolution to granularity
    const granularityMap: { [key: string]: string } = {
      '60': '1/h',
      '240': '4/h',
      '1D': '1/d',
      '1W': '1/w'
    };
    const granularity = granularityMap[resolution];
    if (!granularity) {
      onErrorCallback(`Unsupported resolution: ${resolution}`);
      return;
    }

    // Create the API endpoint
    const formattedFromDate = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
    const formattedToDate = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
    const endpoint = `asset/ohlcv/erg/ergopad/${granularity}/${formattedFromDate}/${formattedToDate}?offset=0&limit=500`;

    // Fetch data from the API
    makeApiRequest(endpoint)
      .then(data => {
        if (!data || data.length === 0) {
          onHistoryCallback([], { noData: true });
          return;
        }

        const bars = data.map((entry: any) => ({
          time: new Date(entry.time).getTime(),
          low: entry.low,
          high: entry.high,
          open: entry.open,
          close: entry.close,
          volume: entry.volume
        }));

        onHistoryCallback(bars, { noData: false });
      })
      .catch(error => {
        console.log('[getBars]: Get error', error);
        onErrorCallback(error.toString());
      });
  },
  subscribeBars: (symbolInfo: any, resolution: any, onRealtimeCallback: any, subscriberUID: any, onResetCacheNeededCallback: any) => {
    console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
  },
  unsubscribeBars: (subscriberUID: any) => {
    console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
  },
}