import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 用终端里打印的局域网地址打开时，否则 /_next/hmr 会被拦下，开发客户端会整页刷新。
  allowedDevOrigins: ["172.17.49.35"],
};

export default nextConfig;
