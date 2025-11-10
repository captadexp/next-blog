import {generateSitemap} from "@supergrowthai/next-blog/next";
import {dbProvider} from "@/lib/db";

const {GET} = generateSitemap({db: dbProvider});
export {GET};