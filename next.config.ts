import type { NextConfig } from "next";
import { Route } from "./src/shared/routes";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No framing anywhere (clickjacking on admin actions).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera (in-app capture) and geolocation (현재 위치) are used by our own pages only.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" },
        ],
      },
    ];
  },
  // The report flow used to be 3 pages; it is now a single page at /report.
  async redirects() {
    return [{ source: `${Route.Report}/:step(photo|location|confirm|complete)`, destination: Route.Report, permanent: true }];
  },
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
