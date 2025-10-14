import {generateRobotsTxt} from "@supergrowthai/next-blog/next";
import {dbProvider} from "@/lib/db";

export const dynamic = 'force-dynamic';

const {GET} = generateRobotsTxt(dbProvider);
export {GET};