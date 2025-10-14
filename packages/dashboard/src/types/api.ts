import type {Permission} from '@supergrowthai/next-blog-types';

export interface CreateBlogInput {
    title: string;
    slug: string;
    content: string;
    status: "draft" | "published";
    category: string;
    tags: string[];
}

export interface UpdateBlogInput {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    category?: string;
    tags?: string[];
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    name: string;
    slug: string;
    bio: string;
    permissions?: Permission[];
}

export interface UpdateUserInput {
    username?: string;
    email?: string;
    password?: string;
    name?: string;
    slug?: string;
    bio?: string;
    permissions?: Permission[];
}

export interface CreateCategoryInput {
    name: string;
    description?: string;
    slug: string;
}

export interface UpdateCategoryInput {
    name?: string;
    description?: string;
    slug?: string;
}

export interface CreateTagInput {
    name: string;
    slug: string;
}

export interface UpdateTagInput {
    name?: string;
    slug?: string;
}

export interface CreateSettingsInput {
    key: string;
    value: string | boolean | number | boolean[] | string[] | number[];
    ownerId: string;
}

export interface UpdateSettingsInput {
    key?: string;
    value?: string | boolean | number | boolean[] | string[] | number[];
    ownerId?: string;
}

export interface CreatePluginInput {
    url: string;
}

export interface UpdatePluginInput {
    name?: string;
    description?: string;
    version?: string;
    url?: string;
    author?: string;
}

export interface CreateCommentInput {
    blogId: string;
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
    content: string;
    parentCommentId?: string;
}

export interface UpdateCommentInput {
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
    content?: string;
    status?: 'pending' | 'approved' | 'spam' | 'trash';
}

export interface CreateMediaInput {
    filename: string;
    url: string;
    mimeType: string;
    altText?: string;
    caption?: string;
    description?: string;
    width?: number;
    height?: number;
}

export interface UpdateMediaInput {
    filename?: string;
    url?: string;
    mimeType?: string;
    altText?: string;
    caption?: string;
    description?: string;
    width?: number;
    height?: number;
}