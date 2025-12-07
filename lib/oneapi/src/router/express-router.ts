import type {NextFunction, Request as ExpressRequest, Response as ExpressResponse} from 'express';
import {CommonResponse, PathObject} from '../types.js';
import {GenericRouter, GenericRouterConfig} from './generic-router.js';

export interface ExpressRouterConfig<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> extends GenericRouterConfig<CREDENTIALS, USER, SESSION> {
}

export class ExpressRouter<CREDENTIALS = unknown, USER = unknown, SESSION = unknown> {
    private genericRouter;

    constructor(pathObject: PathObject, config: ExpressRouterConfig<CREDENTIALS, USER, SESSION> = {}) {
        this.genericRouter = new GenericRouter(pathObject, config);
    }

    middleware(): (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void> {
        return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            try {
                const request = this.convertExpressToWebRequest(req);
                const response = await this.genericRouter.handle(request);
                await this.convertWebToExpressResponse(response, res);
            } catch (error) {
                next(error);
            }
        };
    }

    private convertExpressToWebRequest(req: ExpressRequest): Request {
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headers.set(key, value);
            } else if (Array.isArray(value)) {
                headers.set(key, value.join(','));
            }
        });

        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        let body = undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            if (req.body === undefined || req.body === null) {
                // No body parsing middleware ran - create a ReadableStream from the Express request
                body = new ReadableStream({
                    start(controller) {
                        req.on('data', (chunk) => {
                            controller.enqueue(new Uint8Array(chunk));
                        });

                        req.on('end', () => {
                            controller.close();
                        });

                        req.on('error', (error) => {
                            controller.error(error);
                        });
                    }
                });
            } else {
                // Body was parsed by Express middleware
                body = req.body;

                // Convert parsed objects to appropriate formats
                if (typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof ReadableStream)) {
                    const contentType = req.headers['content-type'];

                    if (contentType?.includes('application/json')) {
                        body = JSON.stringify(req.body);
                    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
                        body = new URLSearchParams(req.body).toString();
                    }
                }
            }
        }

        return new Request(url, {
            method: req.method,
            headers,
            body
        });
    }

    private async convertWebToExpressResponse(response: CommonResponse, res: ExpressResponse): Promise<void> {
        res.status(response.status);

        response.headers.forEach((value, key) => {
            res.append(key, value);
        });

        if (response.body) {
            const reader = response.body.getReader();
            try {
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            } finally {
                reader.releaseLock();
            }
        } else {
            res.end();
        }
    }
}

export function createExpressRouter<CREDENTIALS = any, USER = any, SESSION = any>(pathObject: PathObject, config?: ExpressRouterConfig<CREDENTIALS, USER, SESSION>) {
    return new ExpressRouter<CREDENTIALS, USER, SESSION>(pathObject, config);
}