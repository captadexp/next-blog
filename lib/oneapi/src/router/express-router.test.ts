import {describe, expect, it} from 'bun:test';
import express from 'express';
import request from 'supertest';
import {createExpressRouter, ExpressRouterConfig} from './express-router.js';
import {IAuthHandler, OneApiFunction, PathObject} from "../types.ts";
import {Exception, HttpException, Success} from "../errors.ts";

describe('ExpressRouter', () => {
    const createApp = (pathObject: PathObject, config: ExpressRouterConfig = {}, middleware: any[] = []) => {
        const app = express();
        middleware.forEach(mw => app.use(mw));
        // Disable logging in tests by default
        const router = createExpressRouter(pathObject, {logger: null, ...config});
        app.use(router.middleware());
        return app;
    };

    describe('Basic routing', () => {
        it('handles GET request', async () => {
            const pathObject: PathObject = {
                test: async () => ({code: 0, message: 'hello'})
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/test').expect(200);
            expect(response.body).toEqual({code: 0, message: 'hello'});
        });

        it('handles POST with JSON body', async () => {
            const pathObject: PathObject = {
                echo: async (session, req) => ({code: 0, message: "success", received: req.body})
            };

            const app = createApp(pathObject, {}, [express.json()]);
            const testData = {test: 'data'};

            const response = await request(app)
                .post('/echo')
                .send(testData)
                .expect(200);

            expect(response.body).toEqual({code: 0, message: "success", received: testData});
        });

        it('handles form data', async () => {
            const pathObject: PathObject = {
                form: async (session, req) => ({code: 0, message: "success", received: req.body})
            };

            const app = createApp(pathObject, {}, [express.urlencoded({extended: true})]);

            const response = await request(app)
                .post('/form')
                .send('name=test&email=test@example.com')
                .type('form')
                .expect(200);

            expect(response.body).toEqual({
                code: 0, message: "success",
                received: {name: 'test', email: 'test@example.com'}
            });
        });

        it('returns 404 for missing routes', async () => {
            const pathObject: PathObject = {
                exists: async () => ({code: 0, message: 'found'})
            };

            const app = createApp(pathObject);
            await request(app).get('/missing').expect(404);
        });
    });

    describe('Advanced routing', () => {
        it('handles path parameters', async () => {
            const pathObject: PathObject = {
                users: {
                    ':id': async (session, req) => ({code: 0, message: "success", userId: req._params!.id})
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/users/123').expect(200);
            expect(response.body).toEqual({code: 0, message: "success", userId: '123'});
        });

        it('handles multiple path parameters', async () => {
            const pathObject: PathObject = {
                users: {
                    ':userId': {
                        posts: {
                            ':postId': async (session, req) => ({
                                code: 0, message: "success",
                                userId: req._params!.userId,
                                postId: req._params!.postId
                            })
                        }
                    }
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/users/123/posts/456').expect(200);
            expect(response.body).toEqual({code: 0, message: "success", userId: '123', postId: '456'});
        });

        it('handles query parameters', async () => {
            const pathObject: PathObject = {
                search: async (session, req) => ({code: 0, message: "success", query: req.query})
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/search?q=test&page=1').expect(200);
            expect(response.body).toEqual({code: 0, message: "success", query: {q: 'test', page: '1'}});
        });

        it('handles nested paths', async () => {
            const pathObject: PathObject = {
                api: {
                    v1: {
                        users: async () => ({code: 0, message: "success", users: []})
                    }
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/api/v1/users').expect(200);
            expect(response.body).toEqual({code: 0, message: "success", users: []});
        });

        it('handles wildcard routes', async () => {
            const pathObject: PathObject = {
                api: {
                    '*': async (session, req) => ({
                        code: 0, message: "success",
                        wildcard: true,
                        url: req.url
                    })
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/api/anything').expect(200);
            expect(response.body.wildcard).toBe(true);
        });

        it('handles catch-all routes', async () => {
            const pathObject: PathObject = {
                files: {
                    '[...]': async (session, req) => ({
                        code: 0, message: "success",
                        catchAll: req._params!.catchAll
                    })
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/files/docs/readme.txt').expect(200);
            expect(response.body).toEqual({code: 0, message: "success", catchAll: 'docs/readme.txt'});
        });
    });

    describe('Request/Response handling', () => {
        it('handles custom headers', async () => {
            const pathObject: PathObject = {
                headers: async (session, req) => ({
                    code: 0, message: "success",
                    customHeader: req.headers['x-custom-header']
                })
            };

            const app = createApp(pathObject);
            const response = await request(app)
                .get('/headers')
                .set('X-Custom-Header', 'test-value')
                .expect(200);

            expect(response.body).toEqual({code: 0, message: "success", customHeader: 'test-value'});
        });

        it('handles cookies', async () => {
            const pathObject: PathObject = {
                cookies: async (session, req) => ({
                    code: 0, message: "success",
                    cookies: req.cookies
                })
            };

            const app = createApp(pathObject);
            const response = await request(app)
                .get('/cookies')
                .set('Cookie', 'session=abc123; user=john')
                .expect(200);

            expect(response.body.cookies).toEqual({session: 'abc123', user: 'john'});
        });

        it('handles custom status codes', async () => {
            const pathObject: PathObject = {
                created: async () => new Response(JSON.stringify({id: 1}), {
                    status: 201,
                    headers: {'Content-Type': 'application/json'}
                })
            };

            const app = createApp(pathObject);
            const response = await request(app).post('/created').expect(201);
            expect(response.body).toEqual({id: 1});
        });

        it('handles streaming responses', async () => {
            const pathObject: PathObject = {
                stream: async () => {
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(new TextEncoder().encode('chunk1'));
                            controller.enqueue(new TextEncoder().encode('chunk2'));
                            controller.close();
                        }
                    });
                    return new Response(stream, {
                        headers: {'Content-Type': 'text/plain'}
                    });
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/stream').expect(200);
            expect(response.text).toBe('chunk1chunk2');
        });

        it('handles plain text response', async () => {
            const pathObject: PathObject = {
                text: async () => new Response('Plain text response', {
                    headers: {'Content-Type': 'text/plain'}
                })
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/text').expect(200);
            expect(response.text).toBe('Plain text response');
            expect(response.headers['content-type']).toContain('text/plain');
        });
    });

    describe('Error handling', () => {
        it('handles thrown errors', async () => {
            const pathObject: PathObject = {
                error: async () => {
                    throw new Error('Test error');
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/error').expect(500);
            expect(response.body.code).toBe(500);
            expect(response.body.message).toContain('Test error');
        });

        it('handles HttpException class responses with custom HTTP status', async () => {
            const pathObject: PathObject = {
                exception: async () => {
                    // HttpException maps code directly to HTTP status
                    throw new HttpException(429, 'Too Many Requests', {retryAfter: 60});
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/exception').expect(429);
            expect(response.body.code).toBe(429);
            expect(response.body.message).toBe('Too Many Requests');
            expect(response.body.payload).toEqual({retryAfter: 60});
        });

        it('handles generic Exception with 503 status', async () => {
            const pathObject: PathObject = {
                exception: async () => {
                    // Generic Exception returns HTTP 503, code is application-level only
                    throw new Exception(1001, 'Application error');
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/exception').expect(503);
            expect(response.body.code).toBe(1001);
            expect(response.body.message).toBe('Application error');
        });

        it('handles Success class responses', async () => {
            const pathObject: PathObject = {
                success: async () => {
                    throw new Success('Operation completed', {id: 123});
                }
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/success').expect(200);
            expect(response.body.code).toBe(0);
            expect(response.body.message).toBe('Operation completed');
            expect(response.body.payload).toEqual({id: 123});
        });

        it('handles response with code/message structure (HTTP 200, code in body)', async () => {
            // Returning {code, message} from handler always returns HTTP 200
            // The code field is application-level, not HTTP status
            // Use HttpException or native Response for custom HTTP status
            const pathObject: PathObject = {
                structured: async () => ({
                    code: 202,
                    message: 'Accepted for processing',
                    data: {taskId: 'abc123'}
                })
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/structured').expect(200);
            expect(response.body.code).toBe(202);
            expect(response.body.message).toBe('Accepted for processing');
            expect(response.body.data).toEqual({taskId: 'abc123'});
        });

        it('handles custom HTTP status via native Response', async () => {
            // For custom HTTP status codes, return a native Response
            const pathObject: PathObject = {
                accepted: async () => new Response(
                    JSON.stringify({code: 202, message: 'Accepted', taskId: 'abc123'}),
                    {status: 202, headers: {'Content-Type': 'application/json'}}
                )
            };

            const app = createApp(pathObject);
            const response = await request(app).get('/accepted').expect(202);
            expect(response.body.code).toBe(202);
            expect(response.body.taskId).toBe('abc123');
        });
    });

    describe('Authentication', () => {
        const createMockAuthHandler = () => ({
            getSession: async () => ({sessionId: 'test-session'}),
            getUser: async () => ({id: 1, name: 'Test User'}),
            login: async () => ({success: true, user: {id: 1, name: 'Test User'}}),
            logout: async () => {
            },
            isAuthenticated: async () => true,
            updateUser: async () => {
            }
        } as IAuthHandler<{}, { id: 1, name: 'Test User' }, { sessionId: 'test-session' }>);

        it('handles authenticated requests', async () => {
            const pathObject: PathObject = {
                profile: async (session, req) => ({
                    code: 0, message: "success",
                    user: session.user,
                    sessionData: session.session
                })
            };

            const app = createApp(pathObject, {authHandler: createMockAuthHandler()});
            const response = await request(app).get('/profile').expect(200);
            expect(response.body).toEqual({
                code: 0, message: "success",
                user: {id: 1, name: 'Test User'},
                sessionData: {sessionId: 'test-session'}
            });
        });

        it('handles auth failure with Response return', async () => {
            const authHandler = {
                ...createMockAuthHandler(),
                getSession: async () => new Response(JSON.stringify({error: 'Unauthorized'}), {
                    status: 401,
                    headers: {'Content-Type': 'application/json'}
                })
            };

            const pathObject: PathObject = {
                secure: async () => ({code: 0, message: "success", data: 'secret'})
            };

            const app = createApp(pathObject, {authHandler});
            const response = await request(app).get('/secure').expect(401);
            expect(response.body).toEqual({error: 'Unauthorized'});
        });
    });

    describe('Streaming and body parsing', () => {
        it('skips body parsing when parseBody is false', async () => {
            const handler: OneApiFunction = async (session, req) => ({
                code: 0, message: "success",
                body: req.body,
                hasRawRequest: req._request instanceof Request
            });
            handler.config = {parseBody: false};

            const pathObject: PathObject = {raw: handler};
            const app = createApp(pathObject, {}, [express.json()]);

            const response = await request(app)
                .post('/raw')
                .send({test: 'data'})
                .expect(200);

            expect(response.body.body).toBe(null);
            expect(response.body.hasRawRequest).toBe(true);
        });

        it('enables streaming upload with parseBody: false', async () => {
            const handler: OneApiFunction = async (session, req) => {
                const reader = req._request!.body?.getReader();
                const chunks = [];

                if (reader) {
                    try {
                        while (true) {
                            const {done, value} = await reader.read();
                            if (done) break;
                            chunks.push(value);
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }

                return {
                    code: 0, message: "success",
                    chunkCount: chunks.length,
                    totalBytes: chunks.reduce((sum, chunk) => sum + chunk.length, 0)
                };
            };
            handler.config = {parseBody: false};

            const pathObject: PathObject = {upload: handler};
            const app = createApp(pathObject);

            const testData = Buffer.from('This is test file content for streaming upload');
            const response = await request(app)
                .post('/upload')
                .send(testData)
                .type('application/octet-stream')
                .expect(200);

            expect(response.body.chunkCount).toBeGreaterThan(0);
            expect(response.body.totalBytes).toBe(testData.length);
        });

        it('handles large file streaming efficiently', async () => {
            const handler: OneApiFunction = async (session, req) => {
                const reader = req._request!.body?.getReader();
                let processedChunks = 0;
                let totalSize = 0;

                if (reader) {
                    try {
                        while (true) {
                            const {done, value} = await reader.read();
                            if (done) break;

                            processedChunks++;
                            totalSize += value.length;
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }

                return {code: 0, message: "success", processedChunks, totalSize};
            };
            handler.config = {parseBody: false};

            const pathObject: PathObject = {'large-upload': handler};
            const app = createApp(pathObject);

            const largeData = Buffer.alloc(50000, 'x');
            const response = await request(app)
                .post('/large-upload')
                .send(largeData)
                .type('application/octet-stream')
                .expect(200);

            expect(response.body.processedChunks).toBeGreaterThan(0);
            expect(response.body.totalSize).toBe(largeData.length);
        });
    });

    describe('Configuration', () => {
        it('handles pathPrefix config', async () => {
            const pathObject: PathObject = {
                test: async () => ({code: 0, message: 'prefixed'})
            };

            const app = createApp(pathObject, {pathPrefix: '/api/v1'});
            const response = await request(app).get('/api/v1/test').expect(200);
            expect(response.body).toEqual({code: 0, message: 'prefixed'});
        });
    });

    describe('Edge cases', () => {
        it('handles empty request body', async () => {
            const pathObject: PathObject = {
                empty: async (session, req) => ({
                    code: 0, message: "success",
                    body: req.body,
                    hasBody: req.body !== null
                })
            };

            const app = createApp(pathObject, {}, [express.json()]);
            const response = await request(app).post('/empty').expect(200);
            expect(response.body.body).toBe(null);
        });

        it('handles malformed data gracefully', async () => {
            const pathObject: PathObject = {
                json: async (session, req) => ({code: 0, message: "success", body: req.body})
            };

            const app = createApp(pathObject, {}, [express.raw({type: 'application/json'})]);
            const response = await request(app)
                .post('/json')
                .send('{ invalid json }')
                .type('application/json')
                .expect(200);

            expect(response.body.body).toBeDefined();
        });

        it('handles very long URLs', async () => {
            const longPath = 'x'.repeat(1000);
            const pathObject: PathObject = {
                [longPath]: async () => ({code: 0, message: "success", success: true})
            };

            const app = createApp(pathObject);
            const response = await request(app).get(`/${longPath}`).expect(200);
            expect(response.body).toEqual({code: 0, message: "success", success: true});
        });

        it('handles many query parameters', async () => {
            const pathObject: PathObject = {
                query: async (session, req) => ({
                    code: 0, message: "success",
                    paramCount: Object.keys(req.query).length
                })
            };

            const app = createApp(pathObject);
            const params = Array.from({length: 50}, (_, i) => `param${i}=value${i}`).join('&');
            const response = await request(app).get(`/query?${params}`).expect(200);
            expect(response.body.paramCount).toBe(50);
        });
    });
});