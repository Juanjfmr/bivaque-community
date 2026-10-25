import type { NextConfig } from "next";

// GitHub Pages: static export of the prototype, with all demo routes prerendered.
// Normal Vercel / development builds keep their previous configuration.
const pages = process.env.GITHUB_PAGES === "true";
const config: NextConfig = {
  ...(pages ? {
    output: "export",
    basePath: "/bivaque-community",
    trailingSlash: true,
    images: { unoptimized: true, remotePatterns: [{protocol: "https" as const,hostname:"images.unsplash.com"}] },
  } : {
    images: { remotePatterns: [{protocol:"https" as const,hostname:"images.unsplash.com"}] },
  }),
};
export default config;
