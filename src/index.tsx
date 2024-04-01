import React from "react";
import {Blog, Category, DatabaseProvider, Tag} from "./database";
import {NextRequest, NextResponse} from "next/server";
import {getParamFromUrl, matchPathToFunction, PathObject} from "./utils/parse-path";
import BlogUI from "./components/BlogUI";
import CategoryUI from "./components/CategoryUI";
import TagUI from "./components/TagUI";
import InternalDashboard from "./components/internal/Dashboard";
import NotFound from "./components/NotFound";
import ManageCategories from "./components/internal/ManageCategories";
import ManageTags from "./components/internal/ManageTags";
import ManageBlogs from "./components/internal/ManageBlogs";

export * from "./database"

export default function nextBlog({rewrite, db}: { rewrite: string, db: DatabaseProvider }) {
    const cmsPaths: PathObject = {
        'api': {
            'sgai-blog': {
                'blog': {
                    ':slug': {
                        '': async (params: { slug: string }) => {
                            const slug = params["slug"];
                            const blog = await db.blogs.findOne({slug});
                            return <BlogUI blog={blog}/>;
                        }
                    }
                },
                'categories': {
                    ':category': {
                        '': async (params: { category: string }) => {
                            const categorySlug = params['category'];
                            const category = await db.categories.findById(categorySlug)
                            const blogs = await db.blogs.find({category});
                            return <CategoryUI category={category} blogs={blogs}/>;
                        }
                    }
                },
                'tags': {
                    ':tag': {
                        '': async (params: { tag: string }) => {
                            const tagSlug = params['tag'];
                            const tag = await db.tags.findById(tagSlug)
                            const blogs = await db.blogs.find({tags: tag});
                            return <TagUI tag={tag} blogs={blogs}/>;
                        }
                    }
                },
                'dashboard': {
                    '': () => <InternalDashboard/>,
                    'blogs': {
                        '': () => <ManageBlogs/>,
                        'create': async () => {
                            // Handle blog creation
                        },
                        ':id': {
                            '': async () => {
                                return <NotFound/>
                            },
                            'delete': async () => {
                                return <NotFound/>
                            }
                        }
                    },
                    'categories': {
                        '': () => <ManageCategories/>,
                        'create': async () => {
                            return <NotFound/>
                        },
                        ':id': {
                            '': async () => {
                                return <NotFound/>
                            },
                            'delete': async () => {
                                return <NotFound/>
                            }
                        }
                    },
                    'tags': {
                        '': () => <ManageTags/>,
                        'create': async () => {
                            return <NotFound/>
                        },
                        ':id': {
                            '': async () => {
                                return <NotFound/>
                            },
                            'delete': async () => {
                                return <NotFound/>
                            }
                        }
                    }
                }
            }
        }
    };

    async function GET(request: NextRequest, _response: NextResponse) {
        const ReactDOMServer = (await import('react-dom/server')).default;
        const finalPathname = request.nextUrl.pathname.replace(rewrite, "/api/sgai-blog/")

        const {
            params,
            handler,
            templatePath
        } = matchPathToFunction(cmsPaths, finalPathname)

        if (!handler)
            return new NextResponse(ReactDOMServer.renderToString(
                <NotFound/>), {headers: {"Content-Type": "text/html"}})

        const response = await handler(params);
        if (response instanceof NextResponse)
            return response;

        return new NextResponse(ReactDOMServer.renderToString(response), {headers: {"Content-Type": "text/html"}});
    }

    function POST(request: NextRequest, response: NextResponse) {
        return NextResponse.json({okay: 1})
    }

    return {GET, POST}
}

