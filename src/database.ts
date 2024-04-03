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

    find(filter: Filter<T>): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Filter<T>, update: Omit<Filter<T>, "_id">): Promise<void>;

    deleteOne(filter: Filter<T>): Promise<void>;
}

