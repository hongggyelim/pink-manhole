import type { NextConfig } from "next";
import { Route } from "./src/shared/routes";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
