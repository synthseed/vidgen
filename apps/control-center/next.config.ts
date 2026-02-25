import type { NextConfig } from 'next';

const basePath = process.env.CONTROL_CENTER_BASE_PATH || '/control-center';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  basePath,
  assetPrefix: basePath,
  trailingSlash: false
};

export default nextConfig;
