/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./src/lib/pdf-templates/**/*",
      ],
    },
  },
};

export default nextConfig;