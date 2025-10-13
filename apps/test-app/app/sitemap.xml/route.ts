import {generateSitemapIndex} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

export const dynamic = 'force-dynamic';

const {GET} = generateSitemapIndex(dbProvider);
export {GET};