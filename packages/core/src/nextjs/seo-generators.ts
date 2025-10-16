import {getLlmsTxt, getRobotsTxt, getRssFeed, getSitemap, getSitemapIndex} from "../api";
import {createSingleEndpointNextJSRouter} from "../utils/singleEndpointRouter.js";

export const generateSitemap = createSingleEndpointNextJSRouter(getSitemap, {pathPrefix: "/sitemap/"});
export const generateSitemapIndex = createSingleEndpointNextJSRouter(getSitemapIndex);
export const generateRobotsTxt = createSingleEndpointNextJSRouter(getRobotsTxt);
export const generateLlmsTxt = createSingleEndpointNextJSRouter(getLlmsTxt);
export const generateRssFeed = createSingleEndpointNextJSRouter(getRssFeed);

export default {}