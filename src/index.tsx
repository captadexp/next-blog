import React from "react";
import {Blog, Category, DatabaseProvider, Tag} from "./database";
import {NextRequest, NextResponse} from "next/server";
import {getParamFromUrl, matchPathToFunction, PathObject} from "./utils/parse-path";
import NotFound from "./components/NotFound";
import ManageBlogs from "./components/dashboard/ManageBlogs";
import secure from "./utils/secureInternal";
import BlogUI from "./components/BlogUI";
import CategoryUI from "./components/CategoryUI";
import TagUI from "./components/TagUI";
import AuthorUI from "./components/AuthorUI";
import BasePage from "./components/utils/BasePage";
import fileDBProvider from "./providers/FileDBProvider"
import MongoDBProvider from "./providers/MongoDBProvider"

export type CNextRequest = NextRequest & { _params: Record<string, string> }

export default function nextBlog({db}: { db: DatabaseProvider }) {
    const cmsPaths: { GET: PathObject, POST: PathObject } = {
        GET: {
            api: {},
            dashboard: {
                '': secure(() => <BasePage>
                    <div>
                        <ul>
                            <li><a href={"/api/sgai-blog/dashboard/blogs"}>Blogs</a></li>
                            <li><a href={"/api/sgai-blog/dashboard/tags"}>Tags</a></li>
                            <li><a href={"/api/sgai-blog/dashboard/categories"}>Categories</a></li>
                            <li><a href={"/api/sgai-blog/dashboard/authors"}>Authors</a></li>
                        </ul>
                    </div>
                </BasePage>),
                blogs: {
                    '': secure(async (request: CNextRequest) => {
                        const items = await db.blogs.find({})
                        return <BasePage>
                            <a href={"/api/sgai-blog/dashboard/blogs/create"}>Create Blog</a><br/>
                            <ul>
                                {items.map((item, index) => <li key={index}>
                                    <a href={`/api/sgai-blog/dashboard/blogs/${item._id}`}>
                                        {item.title}
                                    </a>
                                </li>)}
                            </ul>
                        </BasePage>
                    }),
                    create: secure(async (request: CNextRequest) => {
                        return <BasePage><ManageBlogs/></BasePage>;
                    }),
                    ':id': secure(async (request: CNextRequest) => {
                        const id = request._params.id;
                        const blog = await db.blogs.findById(id)
                        if (!blog) return <NotFound/>
                        return <BasePage>
                            <p>{blog._id}</p>
                            <p>{blog.title}</p>
                        </BasePage>
                    })
                },
                categories: {
                    '': secure(async (request: CNextRequest) => {
                        const items = await db.categories.find({})
                        return <>
                            <a href={"/api/sgai-blog/dashboard/categories/create"}>Create Category</a>
                            <ul>
                                {items.map((item, index) => <li key={index}>
                                    <a href={`/api/sgai-blog/dashboard/categories/${item._id}`}>
                                        {item.name}
                                    </a>
                                </li>)}
                            </ul>
                        </>
                    }),
                    create: async () => {
                        return <NotFound/>
                    },
                    ':id': secure(async (request: CNextRequest) => {
                        const id = request._params.id
                        return await db.categories.findById(id)
                    })
                },
                tags: {
                    '': secure(async (request: CNextRequest) => {
                        const items = await db.tags.find({})
                        return <>
                            <a href={"/api/sgai-blog/dashboard/tags/create"}>Create Tags</a>
                            <ul>
                                {items.map((item, index) => <li key={index}>
                                    <a href={`/api/sgai-blog/dashboard/tags/${item._id}`}>
                                        {item.name}
                                    </a>
                                </li>)}
                            </ul>
                        </>
                    }),
                    create: secure(async () => {
                        return <NotFound/>
                    }),
                    ':id': secure(async (request: CNextRequest) => {
                        const id = request._params.id
                        return await db.tags.findById(id)
                    })
                },
                authors: {
                    '': secure(async (request: CNextRequest) => {
                        const items = await db.authors.find({})
                        return <>
                            <a href={"/api/sgai-blog/dashboard/tags/create"}>Create Authors</a>
                            <ul>{items.map((item, index) => <li key={index}>
                                <a href={`/api/sgai-blog/dashboard/tags/${item._id}`}>
                                    {item.name}
                                </a>
                            </li>)}
                            </ul>
                        </>
                    }),
                    create: secure(async () => {
                        return <NotFound/>
                    }),
                    ':id': secure(async (request: CNextRequest) => {
                        const id = request._params.id
                        return await db.authors.findById(id)
                    })
                }
            }
        },
        POST: {
            api: {
                blog: {
                    ':id': {
                        update: secure(async (request: CNextRequest) => {
                            return db.blogs.updateOne({id: request._params}, await request.json())
                        }),
                        delete: secure(async (request: CNextRequest) => {
                            return db.blogs.deleteOne({id: request._params})
                        })
                    }
                },
                blogs: {
                    create: secure(async (request: CNextRequest) => {
                        const creation = await db.blogs.create(await request.json())
                        return JSON.stringify(creation)
                    }),
                },
                category: {
                    ':id': {
                        update: secure(async (request: CNextRequest) => {
                            return db.categories.updateOne({id: request._params}, await request.json())
                        }),
                        delete: secure(async (request: CNextRequest) => {
                            return db.categories.deleteOne({id: request._params})
                        })
                    }
                },
                categories: {
                    create: secure(async (request: CNextRequest) => {
                        return db.categories.create(await request.json())
                    })
                },
                tag: {
                    ':id': {
                        update: secure(async (request: CNextRequest) => {
                            return db.tags.updateOne({id: request._params}, await request.json())
                        }),
                        delete: secure(async (request: CNextRequest) => {
                            return db.tags.deleteOne({id: request._params})
                        })
                    }
                },
                tags: {
                    create: secure(async (request: CNextRequest) => {
                        return db.tags.create(await request.json())
                    })
                },
                author: {
                    ':id': {
                        update: secure(async (request: CNextRequest) => {
                            return db.authors.updateOne({id: request._params}, await request.json())
                        }),
                        delete: secure(async (request: CNextRequest) => {
                            return db.authors.deleteOne({id: request._params})
                        })
                    }
                },
                authors: {
                    create: secure(async (request: CNextRequest) => {
                        return db.tags.create(await request.json())
                    })
                },
            }
        }
    };

    async function processRequest(pathObject: PathObject, request: NextRequest, _response: NextResponse) {
        const finalPathname = request.nextUrl.pathname.replace("/api/sgai-blog/", "")

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
export {fileDBProvider, MongoDBProvider}
