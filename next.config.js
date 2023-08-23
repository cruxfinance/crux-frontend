/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL,
    CRUX_API: process.env.CRUX_API,
  },
  swcMinify: true,
  // webpack: function (config, options) {
  //   config.experiments = {
  //     asyncWebAssembly: true,
  //     layers: true,
  //   };
  //   return config;
  // },
}

module.exports = nextConfig
