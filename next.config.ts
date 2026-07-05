import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler (stable, opt-in in Next 16). Auto-memoizes components so the
  // DOM side of the app doesn't re-render on every Zustand/theme change — this
  // matters here because several components sit next to <Canvas> trees and we
  // want React work kept off the frame budget of the r3f render loop.
  reactCompiler: true,
};

export default nextConfig;
