import type { MetadataRoute } from "next";
import { ApiRoute, Route } from "@/shared/routes";
import { siteUrl } from "@/shared/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: Route.Landing, disallow: [Route.Admin, ...Object.values(ApiRoute)] }],
    sitemap: `${siteUrl()}${Route.Sitemap}`,
    host: siteUrl(),
  };
}
