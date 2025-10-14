import {generateLlmsTxt} from "@supergrowthai/next-blog/next";
import {dbProvider} from "@/lib/db";

const {GET} = generateLlmsTxt(dbProvider);
export {GET};