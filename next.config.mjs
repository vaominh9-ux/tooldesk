/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.TOOLDESK_BUILD_DIR || '.next',
  reactStrictMode: false,
  poweredByHeader: false,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: { ignoreBuildErrors: false },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 50,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/brain/**',
          '**/.system_generated/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
