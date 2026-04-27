import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist has canvas as an optional dependency — ignore it in browser builds
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
