import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/compositor-linux-x64-musl',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-arm64-musl',
    '@remotion/compositor-linux-arm64-gnu',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
    '@remotion/compositor-win32-x64-msvc',
  ],
};

export default nextConfig;
