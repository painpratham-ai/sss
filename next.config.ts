import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next_user",
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.chatglm.cn",
    "preview-chat-*.space-z.ai",
  ],
};

export default nextConfig;
