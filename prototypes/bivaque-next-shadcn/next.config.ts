import type { NextConfig } from "next";
// The R72 demo photos are Unsplash assets, cited in the approved HTML source.
const config: NextConfig = {
  images: {remotePatterns: [{protocol: "https", hostname: "images.unsplash.com"}]},
};
export default config;
