/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@finanzapp/types', '@finanzapp/utils', '@finanzapp/config'],
};

export default nextConfig;
