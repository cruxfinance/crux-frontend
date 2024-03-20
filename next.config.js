/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    ERGOPAD_API: process.env.ERGOPAD_API,
    CRUX_API: process.env.CRUX_API,
    EXPLORER_API: process.env.EXPLORER_API,
    ERGONODE_API: process.env.ERGONODE_API,
    ERGOPAY_DOMAIN: process.env.ERGOPAY_DOMAIN,
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    ADMIN_ADDRESS: process.env.ADMIN_ADDRESS,
    AMAZON_ACCESS_KEY: process.env.AMAZON_ACCESS_KEY,
    AMAZON_SECRET_KEY: process.env.AMAZON_SECRET_KEY,
    AMAZON_REGION: process.env.AMAZON_REGION,
    CRUX_PUBLIC_BUCKET: process.env.CRUX_PUBLIC_BUCKET,
    CRUX_REPORTS_BUCKET: process.env.CRUX_REPORTS_BUCKET,
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

module.exports = nextConfig;
