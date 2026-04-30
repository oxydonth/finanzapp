import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@finanzapp/types', '@finanzapp/utils', '@finanzapp/config'],
  webpack: (config) => {
    config.resolve.alias['react'] = require.resolve('react');
    config.resolve.alias['react-dom'] = require.resolve('react-dom');
    return config;
  },
};

export default nextConfig;
