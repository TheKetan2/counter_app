/** @type {import('next').NextConfig} */
const basePath = process.env.GITHUB_PAGES === "true" ? "/counter_app" : "";
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: process.env.GITHUB_PAGES === "true" || process.env.ANDROID_BUILD === "true" },
  ...(basePath ? { basePath, assetPrefix: basePath } : {})
};
export default nextConfig;
