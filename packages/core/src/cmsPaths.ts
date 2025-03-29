import {CNextRequest} from "./types";
import {PathObject} from "./utils/parse-path";
import secure from "./utils/secureInternal";
import blogs from "./pages/dashboard/blogs";
import createBlog from "./pages/dashboard/blogs/create";
import updateBlog from "./pages/dashboard/blogs/update";
import categories from "./pages/dashboard/categories";
import createCategory from "./pages/dashboard/categories/create";
import updateCategory from "./pages/dashboard/categories/update";
import tags from "./pages/dashboard/tags";
import createTag from "./pages/dashboard/tags/create";
import updateTag from "./pages/dashboard/tags/update";
import authors from "./pages/dashboard/authors";
import createAuthor from "./pages/dashboard/authors/create";
import updateAuthor from "./pages/dashboard/authors/update";
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
export default cmsPaths
