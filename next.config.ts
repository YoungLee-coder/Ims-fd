import type { NextConfig } from "next";

const securityHeaders = [
  // 禁止被其他站点用 iframe 嵌入，防点击劫持
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 跳到外站时不带完整路径，避免申请编号等出现在对方日志里
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // 用终端里打印的局域网地址打开时，否则 /_next/hmr 会被拦下，开发客户端会整页刷新。
  allowedDevOrigins: ["172.17.49.35"],
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
