import {generateLlmsTxt} from "@supergrowthai/next-blog";
import {dbProvider} from "@/lib/db";

const {GET} = generateLlmsTxt(dbProvider);
export {GET};