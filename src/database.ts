export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    author: string;
    createdAt: number;
    updatedAt: number;
}

export interface BlogData {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    author: string;
}

export interface Category {
    _id: string;
    name: string;
    description: string;
}

export interface CategoryData {
    name: string;
    description: string;
}

export interface Tag {
    _id: string;
    name: string;
}

export interface TagData {
    name: string;
}

export interface Author {
    _id: string;
    name: string;
    email: string;
    bio: string;
}

export interface AuthorData {
    name: string;
    email: string;
    bio: string;
}

export interface DatabaseProvider {
    blogs: CollectionOperations<Blog, BlogData>;
    categories: CollectionOperations<Category, CategoryData>;
    tags: CollectionOperations<Tag, TagData>;
    authors: CollectionOperations<Author, AuthorData>;
}

export interface CollectionOperations<T, U> {
    findOne(filter: Object): Promise<T | null>;

    find(filter: Object): Promise<T[]>;

    findById(id: string): Promise<T | null>;

    create(data: U): Promise<T>;

    updateOne(filter: Object, update: Object): Promise<void>;

    deleteOne(filter: Object): Promise<void>;
}

