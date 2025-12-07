import type {Context, MiddlewareHandler} from 'hono';
import {CommonRequest, CommonResponse, PathObject} from '../types.js';
import {GenericRouter, GenericRouterConfig} from './generic-router.js';

export interface HonoRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> extends GenericRouterConfig<CREDENTIALS, USER, SESSION> {
}

export class HonoRouter<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> {
    private genericRouter;

    constructor(pathObject: PathObject, config: HonoRouterConfig<CREDENTIALS, USER, SESSION> = {}) {
        this.genericRouter = new GenericRouter(pathObject, config);
    }

    middleware(): MiddlewareHandler {
        return async (c: Context) => {
            // Hono uses native Web Request, so we can pass it directly
            const request = c.req.raw as CommonRequest;
            const response = await this.genericRouter.handle(request);
            return response as CommonResponse;
        };
    }
}

export function createHonoRouter<CREDENTIALS = any, USER = any, SESSION = any>(pathObject: PathObject, config?: HonoRouterConfig<CREDENTIALS, USER, SESSION>) {
    return new HonoRouter<CREDENTIALS, USER, SESSION>(pathObject, config);
}