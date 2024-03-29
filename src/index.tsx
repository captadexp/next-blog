import React from "react";
import {Blog, Category, DatabaseProvider, Tag} from "./database";
import {NextRequest, NextResponse} from "next/server";
import {getParamFromUrl, matchPathToFunction, PathObject} from "./utils/parse-path";

const ShowBlog = ({blog}: { blog: Blog }) => <div>Show Blog: {blog?.title}</div>;
const ShowCategory = ({category, blogs}: { category: Category, blogs: Blog[] }) => <div>Show
    Category: {category.name}</div>;
const ShowTag = ({tag, blogs}: { tag: Tag, blogs: Blog[] }) => <div>Show Tag: {tag.name}</div>;
const ShowDashboard = () => <div>Dashboard</div>;
const ManageBlogs = () => <div>Manage Blogs</div>;
const ManageCategories = () => <div>Manage Categories</div>;
const ManageTags = () => <div>Manage Tags</div>;
const NotFound = () => <div>404 - Not Found</div>;

export * from "./database"

export default function nextBlog({db}: { db: DatabaseProvider }) {
    const cmsPaths: PathObject = {
        'api': {
            'sgai-blog': {
                'blog': {
                    ':slug': {
                        '': async (params: { slug: string }) => {
                            const slug = params["slug"];
                            const blog = await db.blogs.findOne({slug});
                            return <ShowBlog blog={blog}/>;
                        }
                    }
                },
                'categories': {
                    ':category': {
                        '': async (params: { category: string }) => {
                            const categorySlug = params['category'];
                            const category = await db.categories.findById(categorySlug)
                            const blogs = await db.blogs.find({category});
                            return <ShowCategory category={category} blogs={blogs}/>;
                        }
                    }
                },
                'tags': {
                    ':tag': {
                        '': async (params: { tag: string }) => {
                            const tagSlug = params['tag'];
                            const tag = await db.tags.findById(tagSlug)
                            const blogs = await db.blogs.find({tags: tag});
                            return <ShowTag tag={tag} blogs={blogs}/>;
                        }
                    }
                },
                'dashboard': {
                    '': () => <ShowDashboard/>,
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

    async function GET(request: NextRequest, response: NextResponse) {
        const ReactDOMServer = (await import('react-dom/server')).default;

        const {
            params,
            handler,
            templatePath
        } = matchPathToFunction(cmsPaths, request.nextUrl.pathname)

        return new NextResponse(ReactDOMServer.renderToString(await handler?.(params) ||
            <NotFound/>), {headers: {"Content-Type": "text/html"}});
    }

    function POST(request: NextRequest, response: NextResponse) {
        return NextResponse.json({okay: 1})
    }

    return {GET, POST}
}

