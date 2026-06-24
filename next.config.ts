import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-ef41a5ef-4ea9-4dfe-9245-2925d9052bb2.space-z.ai',
    '.space-z.ai',
  ],
};

export default nextConfig;
