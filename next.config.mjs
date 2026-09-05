/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./src/lib/pdf-templates/**/*",
      ],
    },
  },
};

export default nextConfig;
