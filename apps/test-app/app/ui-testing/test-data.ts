import {dbProvider} from '@/lib/db';
import type {Category, HydratedBlog, Tag, User} from '@supergrowthai/next-blog';

export async function getTestBlogs(limit: number = 10): Promise<HydratedBlog[]> {
    const db = await dbProvider();
    const blogs = await db.generated.getRecentBlogs(limit);
    return blogs;
}

export async function getTestBlog(): Promise<HydratedBlog | null> {
    const db = await dbProvider();
    const blog = await db.generated.getHydratedBlog({status: 'published'});
    return blog;
}

export async function getTestCategories(): Promise<Category[]> {
    const db = await dbProvider();
    const categories = await db.generated.getHydratedCategories();
    return categories;
}

export async function getTestTags(): Promise<Tag[]> {
    const db = await dbProvider();
    const tags = await db.generated.getHydratedTags();
    return tags;
}

export async function getTestAuthors(): Promise<User[]> {
    const db = await dbProvider();
    const users = await db.users.find({});
    return users;
}

export async function getTestAuthor(): Promise<User | null> {
    const db = await dbProvider();
    const user = await db.users.findOne({});
    return user;
}

export async function getRelatedTestBlogs(blogId: string): Promise<HydratedBlog[]> {
    const db = await dbProvider();
    const blogs = await db.generated.getRelatedBlogs(blogId, 5);
    return blogs;
}

export async function getTestCategory(): Promise<Category | null> {
    const db = await dbProvider();
    const categories = await db.generated.getHydratedCategories();
    return categories.length > 0 ? categories[0] : null;
}

export async function getTestTag(): Promise<Tag | null> {
    const db = await dbProvider();
    const tags = await db.generated.getHydratedTags();
    return tags.length > 0 ? tags[0] : null;
}

export async function getTestAuthorBlogs(authorId: string): Promise<HydratedBlog[]> {
    const db = await dbProvider();
    const blogs = await db.generated.getHydratedBlogs(
        {userId: authorId, status: 'published'},
        {limit: 10}
    );
    return blogs;
}

export async function getTestCategoryBlogs(categorySlug: string): Promise<HydratedBlog[]> {
    const db = await dbProvider();
    const blogs = await db.generated.getBlogsByCategory(categorySlug, {limit: 10});
    return blogs;
}

export async function getTestTagBlogs(tagSlug: string): Promise<HydratedBlog[]> {
    const db = await dbProvider();
    const blogs = await db.generated.getBlogsByTag(tagSlug, {limit: 10});
    return blogs;
}