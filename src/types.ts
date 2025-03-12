import type {NextRequest} from "next/server";

export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    authorId: string;
    createdAt: number;
    updatedAt: number;
}

export interface BlogData {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    authorId: string;
}

export interface Category {
    _id: string;
    name: string;
    description: string;
    slug: string;
}

export interface CategoryData {
    name: string;
    description: string;
    slug: string;
}

export interface Tag {
    _id: string;
    name: string;
    slug: string;
}

export interface TagData {
    name: string;
    slug: string;
}

export interface Author {
    _id: string;
    name: string;
    slug: string;
    username: string;
    email: string;
    bio: string;
    password: string;
}

export interface AuthorData {
    name: string;
    email: string;
    slug: string;
    username: string;
    bio: string;
    password: string;
}

export interface DatabaseProvider {
    blogs: CollectionOperations<Blog, BlogData>;
    categories: CollectionOperations<Category, CategoryData>;
    tags: CollectionOperations<Tag, TagData>;
    authors: CollectionOperations<Author, AuthorData>;
}

export type Filter<T> = Partial<Record<keyof T, any>>;

export interface CollectionOperations<T, U> {
    findOne(filter: Filter<T>): Promise<T | null>;

    find(filter: Filter<T>, options?: { skip?: number; limit?: number }): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<T>;

    deleteOne(filter: Filter<T>): Promise<T>;
}

export type EventPayload =
    | { event: "createBlog"; payload: Blog }
    | { event: "createTag"; payload: Tag }
    | { event: "createCategory"; payload: Category }
    | { event: "createAuthor"; payload: Author }
    | { event: "updateBlog"; payload: Blog }
    | { event: "updateTag"; payload: Tag }
    | { event: "updateCategory"; payload: Category }
    | { event: "updateAuthor"; payload: Author }
    | { event: "deleteBlog"; payload: Blog }
    | { event: "deleteTag"; payload: Tag }
    | { event: "deleteCategory"; payload: Category }
    | { event: "deleteAuthor"; payload: Author };

export interface ConfigurationCallbacks {
    on?<E extends EventPayload>(event: E["event"], payload: E["payload"]): void;
}

export type Configuration = {
    db(): Promise<DatabaseProvider>;
    byPassSecurity?: boolean;
    callbacks?: ConfigurationCallbacks;
};

export type CNextRequest = NextRequest & {
    _params: Record<string, string>;
    db(): Promise<DatabaseProvider>;
    configuration: Configuration;
    sessionUser: Author;
};
