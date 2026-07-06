import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include calculator files in the build output for createRequire
  outputFileTracingIncludes: {
    '/api/chart': ['./calculator/dist/**/*.js', './calculator/node_modules/**/*'],
    '/api/poster-image': ['./calculator/dist/**/*.js', './calculator/node_modules/**/*', './templates/**/*.html'],
  },
};

export default nextConfig;
