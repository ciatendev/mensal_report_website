/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "@sparticuz/chromium-min"],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./src/lib/pdf-templates/**/*",
      ],
    },
  },
};