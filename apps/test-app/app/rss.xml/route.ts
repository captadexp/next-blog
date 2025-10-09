import {generateRssFeed} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const {GET} = generateRssFeed(dbProvider);
export {GET};