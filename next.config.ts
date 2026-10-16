import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share-card route reads Kitto SVGs from disk at request time.
  outputFileTracingIncludes: {
    "/api/share-card": ["./public/kitto/card/**"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
