import React from "react";
import {Author, Blog, Category, CNextRequest, Configuration, DatabaseProvider, Tag} from "./database";
import {NextRequest, NextResponse} from "next/server";
import {matchPathToFunction, PathObject} from "./utils/parse-path";
import NotFound from "./components/NotFound";
import secure from "./utils/secureInternal";
import BlogUI from "./components/BlogUI";
import CategoryUI from "./components/CategoryUI";
import TagUI from "./components/TagUI";
import AuthorUI from "./components/AuthorUI";
import FileDBProvider from "./providers/FileDBProvider"
import MongoDBProvider from "./providers/MongoDBProvider"
import blogs from "./pages/dashboard/blogs";
import createBlog from "./pages/dashboard//blogs/create";
import updateBlog from "./pages/dashboard//blogs/update";
import categories from "./pages/dashboard//categories";
import createCategory from "./pages/dashboard//categories/create";
import updateCategory from "./pages/dashboard//categories/update";
import tags from "./pages/dashboard//tags";
import createTag from "./pages/dashboard//tags/create";
import updateTag from "./pages/dashboard//tags/update";
import authors from "./pages/dashboard//authors";
import createAuthor from "./pages/dashboard//authors/create";
import updateAuthor from "./pages/dashboard//authors/update";
import dashboard from "./pages/dashboard";
import crypto from "./utils/crypto"


const cmsPaths: { GET: PathObject, POST: PathObject } = {
    GET: {
        api: {},
        dashboard: {
            '': secure(dashboard),
            blogs: {
                '': secure(blogs),
                create: secure(createBlog),
                ':id': secure(updateBlog)
            },
            categories: {
                '': secure(categories),
                create: secure(createCategory),
                ':id': secure(updateCategory)
            },
            tags: {
                '': secure(tags),
                create: secure(createTag),
                ':id': secure(updateTag)
            },
            authors: {
                '': secure(authors),
                create: secure(createAuthor),
                ':id': secure(updateAuthor)
            }
        }
    },
    POST: {
        api: {
            blog: {
                ':id': {
                    update: secure(async (request: CNextRequest) => {
                        const db = await request.db();
                        const body = await request.json();
                        const extras = {updatedAt: Date.now()}
                        const updation = await db.blogs.updateOne({_id: request._params.id}, {...body, ...extras})
                        request.configuration.callbacks?.on?.("updateBlog", updation)
                        return JSON.stringify(updation)
                    }),
                    delete: secure(async (request: CNextRequest) => {
                        const db = await request.db();
                        const deletion = await db.blogs.deleteOne({_id: request._params.id})
                        request.configuration.callbacks?.on?.("deleteBlog", deletion)
                        return JSON.stringify(deletion)
                    })
                }
            },
            blogs: {
                create: secure(async (request: CNextRequest) => {
                    const db = await request.db();
                    const body = await request.json()
                    const extras = {
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }
                    const creation = await db.blogs.create({...body, ...extras, authorId: request.sessionUser._id})
                    request.configuration.callbacks?.on?.("createBlog", creation)
                    return JSON.stringify(creation)
                }),
            },
            category: {
                ':id': {
                    update: secure(async (request: CNextRequest) => {
                        const db = await request.db()
                        const updation = await db.categories.updateOne({_id: request._params.id}, await request.json())
                        request.configuration.callbacks?.on?.("updateCategory", updation)
                        return JSON.stringify(updation)
                    }),
                    delete: secure(async (request: CNextRequest) => {
                        const db = await request.db()
                        const deletion = await db.categories.deleteOne({_id: request._params.id})
                        request.configuration.callbacks?.on?.("deleteCategory", deletion)
                        return JSON.stringify(deletion)
                    })
                }
            },
            categories: {
                create: secure(async (request: CNextRequest) => {
                    const db = await request.db()
                    const creation = await db.categories.create(await request.json());
                    request.configuration.callbacks?.on?.("createCategory", creation)
                    return JSON.stringify(creation)
                })
            },
            tag: {
                ':id': {
                    update: secure(async (request: CNextRequest) => {
                        const db = await request.db()
                        const updation = await db.tags.updateOne({_id: request._params.id}, await request.json())
                        request.configuration.callbacks?.on?.("updateTag", updation)
                        return JSON.stringify(updation)
                    }),
                    delete: secure(async (request: CNextRequest) => {
                        const db = await request.db();
                        const deletion = await db.tags.deleteOne({_id: request._params.id})
                        request.configuration.callbacks?.on?.("deleteTag", deletion)
                        return JSON.stringify(deletion)
                    })
                }
            },
            tags: {
                create: secure(async (request: CNextRequest) => {
                    const db = await request.db()
                    const creation = await db.tags.create(await request.json())
                    request.configuration.callbacks?.on?.("createTag", creation)
                    return JSON.stringify(creation)
                })
            },
            author: {
                ':id': {
                    update: secure(async (request: CNextRequest) => {
                        const db = await request.db()
                        const {password, ...other} = await request.json()
                        const updation = await db.authors.updateOne({_id: request._params.id}, other)
                        request.configuration.callbacks?.on?.("updateAuthor", updation)
                        return JSON.stringify(updation)
                    }),
                    delete: secure(async (request: CNextRequest) => {
                        const db = await request.db()
                        const deletion = await db.authors.deleteOne({_id: request._params.id})
                        request.configuration.callbacks?.on?.("deleteAuthor", deletion)
                        return JSON.stringify(deletion)
                    })
                }
            },
            authors: {
                create: secure(async (request: CNextRequest) => {
                    const db = await request.db()
                    const {password, ...other} = await request.json();
                    const creation = await db.authors.create({...other, password: crypto.hashPassword(password)})
                    request.configuration.callbacks?.on?.("createAuthor", creation)
                    return JSON.stringify(creation)
                })
            },
        }
    }
};

export default function nextBlog(configuration: Configuration) {
    async function processRequest(pathObject: PathObject, request: NextRequest, _response: NextResponse) {
        const finalPathname = request.nextUrl.pathname.replace("/api/sgai-blog/", "")
        const {db} = configuration
        const {
            params,
            handler,
            templatePath
        } = matchPathToFunction(pathObject, finalPathname)

        console.log("=>", request.method, params, templatePath, "executing:", !!handler)

        if (!handler) {
            const ReactDOMServer = (await import('react-dom/server')).default;
            const response = ReactDOMServer.renderToString(<NotFound/>)
            return new NextResponse(response, {headers: {"Content-Type": "text/html"}})
        }

        (request as any)._params = params;
        (request as any).db = db;
        (request as any).configuration = configuration;

        const response = await handler(request);

        if (response instanceof NextResponse || response instanceof Response)
            return response;

        if (typeof response === "string") {
            return new NextResponse(response, {headers: {"Content-Type": "text/html"}});
        }

        const ReactDOMServer = (await import('react-dom/server')).default;
        return new NextResponse(ReactDOMServer.renderToString(response), {headers: {"Content-Type": "text/html"}});
    }

    async function GET(request: NextRequest, response: NextResponse) {
        return processRequest(cmsPaths.GET, request, response)
    }

    async function POST(request: NextRequest, response: NextResponse) {
        return processRequest(cmsPaths.POST, request, response)
    }

    return {GET, POST}
}

export * from "./database"
export {BlogUI, CategoryUI, TagUI, AuthorUI}
export {FileDBProvider, MongoDBProvider}
