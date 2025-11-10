import {generateRssFeed} from "@supergrowthai/next-blog/next";
import {dbProvider} from "@/lib/db";

const {GET} = generateRssFeed({db: dbProvider});
export {GET};