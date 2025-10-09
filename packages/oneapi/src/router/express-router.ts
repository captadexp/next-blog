import type {NextFunction, Request as ExpressRequest, Response as ExpressResponse} from 'express';
import {IRouterConfig, PathObject} from '../types.js';
import {createGenericRouter} from './generic-router.js';

export interface ExpressRouterConfig extends IRouterConfig {
}

export class ExpressRouter {
    private genericRouter;

    constructor(pathObject: PathObject, config: ExpressRouterConfig = {}) {
        this.genericRouter = createGenericRouter(pathObject, config);
    }

    middleware() {
        return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            try {
                // Convert Express Request to standard Request
                const headers = new Headers();
                Object.entries(req.headers).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        headers.set(key, value);
                    } else if (Array.isArray(value)) {
                        headers.set(key, value.join(','));
                    }
                });

                const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

                // Create body stream if needed
                let body = undefined;
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    if (req.body) {
                        const contentType = req.get('content-type');
                        if (contentType?.includes('application/json')) {
                            body = JSON.stringify(req.body);
                        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
                            body = new URLSearchParams(req.body).toString();
                        } else {
                            body = req.body;
                        }
                    }
                }

                const request = new Request(url, {
                    method: req.method,
                    headers,
                    body
                });

                // Handle the request
                const response = await this.genericRouter.handle(request);

                // Convert Response back to Express response
                res.status(response.status);

                response.headers.forEach((value, key) => {
                    res.setHeader(key, value);
                });

                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    res.json(data);
                } else {
                    const text = await response.text();
                    res.send(text);
                }
            } catch (error) {
                next(error);
            }
        };
    }
}

export function createExpressRouter(pathObject: PathObject, config?: ExpressRouterConfig) {
    return new ExpressRouter(pathObject, config);
}