import {generateSitemapIndex} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const {GET} = generateSitemapIndex(dbProvider);
export {GET};