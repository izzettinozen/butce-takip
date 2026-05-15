import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" başlığını gizle.
  poweredByHeader: false,
  // Yanıtları gzip ile sıkıştır.
  compress: true,
  // Geliştirmede olası hataları erken yakalamak için.
  reactStrictMode: true,
};

export default nextConfig;
