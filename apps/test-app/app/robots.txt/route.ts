import {generateRobotsTxt} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

export const dynamic = 'force-dynamic';

const {GET} = generateRobotsTxt(dbProvider);
export {GET};