import {
    StandardResponse,
    Blog,
    Category,
    Tag,
    UIConfig,
    User,
    CreateBlogInput,
    UpdateBlogInput,
    CreateUserInput,
    UpdateUserInput,
    CreateCategoryInput,
    UpdateCategoryInput,
    CreateTagInput,
    UpdateTagInput,
    Permission
} from '../types/api';

class ApiClient {
    private readonly baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
    }

    setToken(token: string) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
    }

    private async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: any
    ): Promise<StandardResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options: RequestInit = {
            method,
            headers,
            credentials: 'include', // Include cookies for session-based auth
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            const data: StandardResponse<T> = await response.json();

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return {
                code: 500,
                message: 'API request failed'
            };
        }
    }

    // Auth APIs
    async login(username: string, password: string): Promise<StandardResponse<User>> {
        return this.request<User>('/login', 'POST', {username, password});
    }

    async logout(): Promise<StandardResponse<null>> {
        return this.request<null>('/logout', 'POST');
    }

    async getCurrentUser(): Promise<StandardResponse<User>> {
        return this.request<User>('/me');
    }

    async checkPermission(permission: Permission): Promise<StandardResponse<boolean>> {
        return this.request<boolean>('/check-permission', 'POST', {permission});
    }

    // Config API
    async getConfig(): Promise<StandardResponse<UIConfig>> {
        return this.request<UIConfig>('/config');
    }

    // Blog APIs
    async getBlogs(): Promise<StandardResponse<Blog[]>> {
        return this.request<Blog[]>('/blogs');
    }

    async getBlog(id: string): Promise<StandardResponse<Blog>> {
        return this.request<Blog>(`/blogs/${id}`);
    }

    async createBlog(data: CreateBlogInput): Promise<StandardResponse<Blog>> {
        return this.request<Blog>('/blogs/create', 'POST', data);
    }

    async updateBlog(id: string, data: UpdateBlogInput): Promise<StandardResponse<Blog>> {
        return this.request<Blog>(`/blog/${id}/update`, 'POST', data);
    }

    async deleteBlog(id: string): Promise<StandardResponse<null>> {
        return this.request<null>(`/blog/${id}/delete`, 'POST');
    }

    // User APIs
    async getUsers(): Promise<StandardResponse<User[]>> {
        return this.request<User[]>('/users');
    }

    async getUser(id: string): Promise<StandardResponse<User>> {
        return this.request<User>(`/users/${id}`);
    }

    async createUser(data: CreateUserInput): Promise<StandardResponse<User>> {
        return this.request<User>('/users/create', 'POST', data);
    }

    async updateUser(id: string, data: UpdateUserInput): Promise<StandardResponse<User>> {
        return this.request<User>(`/users/${id}/update`, 'POST', data);
    }

    async deleteUser(id: string): Promise<StandardResponse<null>> {
        return this.request<null>(`/users/${id}/delete`, 'POST');
    }

    // Permissions
    async getAllPermissions(): Promise<StandardResponse<Permission[]>> {
        return this.request<Permission[]>('/permissions');
    }

    // Category APIs
    async getCategories(): Promise<StandardResponse<Category[]>> {
        return this.request<Category[]>('/categories');
    }

    async getCategory(id: string): Promise<StandardResponse<Category>> {
        return this.request<Category>(`/categories/${id}`);
    }

    async createCategory(data: CreateCategoryInput): Promise<StandardResponse<Category>> {
        return this.request<Category>('/categories/create', 'POST', data);
    }

    async updateCategory(id: string, data: UpdateCategoryInput): Promise<StandardResponse<Category>> {
        return this.request<Category>(`/category/${id}/update`, 'POST', data);
    }

    async deleteCategory(id: string): Promise<StandardResponse<null>> {
        return this.request<null>(`/category/${id}/delete`, 'POST');
    }

    // Tag APIs
    async getTags(): Promise<StandardResponse<Tag[]>> {
        return this.request<Tag[]>('/tags');
    }

    async getTag(id: string): Promise<StandardResponse<Tag>> {
        return this.request<Tag>(`/tags/${id}`);
    }

    async createTag(data: CreateTagInput): Promise<StandardResponse<Tag>> {
        return this.request<Tag>('/tags/create', 'POST', data);
    }

    async updateTag(id: string, data: UpdateTagInput): Promise<StandardResponse<Tag>> {
        return this.request<Tag>(`/tag/${id}/update`, 'POST', data);
    }

    async deleteTag(id: string): Promise<StandardResponse<null>> {
        return this.request<null>(`/tag/${id}/delete`, 'POST');
    }
}

// Export the class for instantiation in the context
export default ApiClient;