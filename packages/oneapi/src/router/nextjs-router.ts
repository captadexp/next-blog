import {IRouterConfig, PathObject} from '../types.js';
import {NextRequest} from "next/server";
import {createGenericRouter} from './generic-router.js';

export interface NextJSRouterConfig extends IRouterConfig {
}

export class NextJSRouter {
    private genericRouter;

    constructor(pathObject: PathObject, config: NextJSRouterConfig = {}) {
        this.genericRouter = createGenericRouter(pathObject, config);
    }

    handlers() {
        const processRequest = (request: NextRequest): Promise<Response> => this.genericRouter.handle(request);

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

export function createNextJSRouter(pathObject: PathObject, config?: NextJSRouterConfig) {
    return new NextJSRouter(pathObject, config);
}