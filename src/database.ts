export interface DatabaseProvider {
    blogs: {
        findOne(filter: Object): Promise<Blog>;
        find(filter: Object): Promise<Blog[]>;
        findById(id: string): Promise<Blog>;
        create(data: BlogData): Promise<Blog>;
        updateOne(filter: Object, update: Object): Promise<void>;
        deleteOne(filter: Object): Promise<void>;
    };
    categories: {
        findById(id: string): Promise<Category>;
        create(data: CategoryData): Promise<Category>;
        updateOne(filter: Object, update: Object): Promise<void>;
        deleteOne(filter: Object): Promise<void>;
    };
    tags: {
        findById(id: string): Promise<Tag>;
        create(data: TagData): Promise<Tag>;
        updateOne(filter: Object, update: Object): Promise<void>;
        deleteOne(filter: Object): Promise<void>;
    };
    authors: {
        findById(id: string): Promise<Author>;
        create(data: AuthorData): Promise<Author>;
        updateOne(filter: Object, update: Object): Promise<void>;
        deleteOne(filter: Object): Promise<void>;
    };
}

export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    author: string;
    createdAt: string;
    updatedAt: string;
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

