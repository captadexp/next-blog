import {generateRobotsTxt} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const {GET} = generateRobotsTxt(dbProvider);
export {GET};