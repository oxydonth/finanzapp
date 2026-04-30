import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@finanzapp/types', '@finanzapp/utils', '@finanzapp/config'],
};

export default nextConfig;
