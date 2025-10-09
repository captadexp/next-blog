import {generateSitemap} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const {GET} = generateSitemap(dbProvider);
export {GET};