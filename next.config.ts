import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pam-stilling-feed.nav.no",
      },
    ],
  },
};

export default nextConfig;
