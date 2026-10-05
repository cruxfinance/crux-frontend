const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Required on Next 13.4 for instrumentation.ts (register()) to run, which
  // is how @sentry/nextjs v8 loads sentry.server.config.ts / sentry.edge.config.ts.
  experimental: {
    instrumentationHook: true,
  },
  env: {
    ERGOPAD_API: process.env.ERGOPAD_API,
    CRUX_API: process.env.CRUX_API,
    EXPLORER_API: process.env.EXPLORER_API,
    ERGONODE_API: process.env.ERGONODE_API,
    ERGOPAY_DOMAIN: process.env.ERGOPAY_DOMAIN,
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    ADMIN_ADDRESS: process.env.ADMIN_ADDRESS
  },
  swcMinify: true,
  // webpack: function (config, options) {
  //   config.experiments = {
  //     asyncWebAssembly: true,
  //     layers: true,
  //   };
  //   return config;
  // },
};

const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  silent: true, // Suppresses all logs
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
