import type {BlogData} from '../../types/plugin-types.js';

// Transform blog database object to our BlogData interface
export function transformBlogData(blog: any): BlogData {
    return {
        id: blog.id,
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        featuredImage: blog.featuredImage,
        author: blog.author,
        categories: blog.categories || [],
        tags: blog.tags || [],
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        publishedAt: blog.publishedAt,
        status: blog.status,
        slug: blog.slug,
        metadata: blog.metadata || {}
    };
}