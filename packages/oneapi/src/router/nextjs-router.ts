import {CommonRequest, CommonResponse, PathObject} from '../types.js';
import {NextRequest} from "next/server";
import {GenericRouter, GenericRouterConfig} from './generic-router.js';

export interface NextJSRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> extends GenericRouterConfig<CREDENTIALS, USER, SESSION> {
}

export class NextJSRouter<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> {
    private genericRouter;

    constructor(pathObject: PathObject, config: NextJSRouterConfig<CREDENTIALS, USER, SESSION> = {}) {
        this.genericRouter = new GenericRouter(pathObject, config);
    }

    handlers() {
        const processRequest = (request: NextRequest): Promise<CommonResponse> => this.genericRouter.handle(request as Request as CommonRequest);

        return {
            GET: processRequest,
            HEAD: processRequest,
            POST: processRequest,
            PUT: processRequest,
            DELETE: processRequest,
            PATCH: processRequest,
            OPTIONS: processRequest,
        };
    }
}

export function createNextJSRouter<CREDENTIALS = any, USER = any, SESSION = any>(pathObject: PathObject, config?: NextJSRouterConfig<CREDENTIALS, USER, SESSION>) {
    return new NextJSRouter<CREDENTIALS, USER, SESSION>(pathObject, config);
}