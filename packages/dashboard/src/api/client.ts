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
    Settings,
    CreateSettingsInput,
    UpdateSettingsInput,
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
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${normalizedEndpoint}`;

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

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        code: 404,
                        message: `Resource not found. Please check the URL: ${url}`
                    };
                }

                return {
                    code: response.status,
                    message: `HTTP error: ${response.statusText}`
                };
            }

            const data: StandardResponse<T> = await response.json();
            return data;
        } catch (error) {
            return {
                code: 500,
                message: 'API request failed'
            };
        }
    }

    // Auth APIs
    async login(username: string, password: string) {
        return this.request<User>('/login', 'POST', { username, password });
    }

    async logout() {
        return this.request<null>('/logout', 'POST');
    }

    async getCurrentUser() {
        return this.request<User>('/me');
    }

    async checkPermission(permission: Permission) {
        return this.request<boolean>('/check-permission', 'POST', { permission });
    }

    // Config API
    async getConfig() {
        return this.request<UIConfig>('/config');
    }

    async updateConfig(data: Partial<UIConfig>) {
        return this.request<UIConfig>('/config', 'POST', data);
    }

    // Blog APIs
    async getBlogs() {
        return this.request<Blog[]>('/blogs');
    }

    async getBlog(id: string) {
        return this.request<Blog>(`/blogs/${id}`);
    }

    async createBlog(data: CreateBlogInput) {
        return this.request<Blog>('/blogs/create', 'POST', data);
    }

    async updateBlog(id: string, data: UpdateBlogInput) {
        return this.request<Blog>(`/blog/${id}/update`, 'POST', data);
    }

    async deleteBlog(id: string) {
        return this.request<null>(`/blog/${id}/delete`, 'POST');
    }

    /**
     * Gets the preview URL for a blog post
     * Uses the current domain and blogBasePath from config to generate the URL
     *
     * @param slug The blog post slug
     * @returns The preview URL for the blog post
     */
    async getBlogPreviewUrl(slug: string) {
        // First try to get from API if it exists
        try {
            const response = await this.request<string>(`/blogs/preview-url`, 'POST', { slug });
            if (response.code === 0 && response.payload) {
                return response;
            }
        } catch (error) {
            // API endpoint not available, falling back to client-side generation
        }

        // Fallback: Get the config to determine the blog base path
        const configResponse = await this.getConfig();
        const blogBasePath = configResponse.payload?.blogBasePath || '/blog';

        // Generate the URL using the current origin and the configured blog path
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const normalizedSlug = slug.startsWith('/') ? slug.slice(1) : slug;

        // Use the actual configured path from settings for the preview URL
        // Ensure proper path formatting to avoid accumulating segments
        const path = blogBasePath.startsWith('/') ? blogBasePath : `/${blogBasePath}`;
        const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

        // Make sure we're not adding additional path segments when the slug contains them
        const url = `${origin}${cleanPath}/${normalizedSlug}`;

        return {
            code: 0,
            message: 'Preview URL generated successfully',
            payload: url
        };

    }

    /**
     * Gets the public URL for a blog post
     * Uses the current domain and blogBasePath from config to generate the URL
     *
     * @param slug The blog post slug
     * @returns The public URL for the blog post
     */
    async getBlogUrl(slug: string) {
        // First try to get from API if it exists
        try {
            const response = await this.request<string>(`/blogs/url`, 'POST', { slug });
            if (response.code === 0 && response.payload) {
                return response;
            }
        } catch (error) {
            // API endpoint not available, falling back to client-side generation
        }

        // Fallback: Get the config to determine the blog base path
        const configResponse = await this.getConfig();
        const blogBasePath = configResponse.payload?.blogBasePath || '/blog';

        // Generate the URL using the current origin and the configured blog path
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const normalizedSlug = slug.startsWith('/') ? slug.slice(1) : slug;

        // Use the actual configured path from settings for the preview URL
        // Ensure proper path formatting to avoid accumulating segments
        const path = blogBasePath.startsWith('/') ? blogBasePath : `/${blogBasePath}`;
        const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

        // Make sure we're not adding additional path segments when the slug contains them
        const url = `${origin}${cleanPath}/${normalizedSlug}`;

        return {
            code: 0,
            message: 'Blog URL generated successfully',
            payload: url
        };
    }

    // User APIs
    async getUsers() {
        return this.request<User[]>('/users');
    }

    async getUser(id: string) {
        return this.request<User>(`/users/${id}`);
    }

    async createUser(data: CreateUserInput) {
        return this.request<User>('/users/create', 'POST', data);
    }

    async updateUser(id: string, data: UpdateUserInput) {
        return this.request<User>(`/user/${id}/update`, 'POST', data);
    }

    async deleteUser(id: string) {
        return this.request<null>(`/user/${id}/delete`, 'POST');
    }

    // Permissions
    async getAllPermissions() {
        return this.request<Permission[]>('/permissions');
    }

    // Category APIs
    async getCategories() {
        return this.request<Category[]>('/categories');
    }

    async getCategory(id: string) {
        return this.request<Category>(`/categories/${id}`);
    }

    async createCategory(data: CreateCategoryInput) {
        return this.request<Category>('/categories/create', 'POST', data);
    }

    async updateCategory(id: string, data: UpdateCategoryInput) {
        return this.request<Category>(`/category/${id}/update`, 'POST', data);
    }

    async deleteCategory(id: string) {
        return this.request<null>(`/category/${id}/delete`, 'POST');
    }

    // Tag APIs
    async getTags() {
        return this.request<Tag[]>('/tags');
    }

    async getTag(id: string) {
        return this.request<Tag>(`/tags/${id}`);
    }

    async createTag(data: CreateTagInput) {
        return this.request<Tag>('/tags/create', 'POST', data);
    }

    async updateTag(id: string, data: UpdateTagInput) {
        return this.request<Tag>(`/tag/${id}/update`, 'POST', data);
    }

    async deleteTag(id: string) {
        return this.request<null>(`/tag/${id}/delete`, 'POST');
    }

    // Settings APIs
    async getSettings(): Promise<StandardResponse<Settings[]>> {
        return this.request<Settings[]>('/settings');
    }

    async getSetting(id: string): Promise<StandardResponse<Settings>> {
        return this.request<Settings>(`/settings/${id}`);
    }

    async createSetting(data: CreateSettingsInput): Promise<StandardResponse<Settings>> {
        return this.request<Settings>('/settings/create', 'POST', data);
    }

    async updateSetting(id: string, data: UpdateSettingsInput): Promise<StandardResponse<Settings>> {
        return this.request<Settings>(`/setting/${id}/update`, 'POST', data);
    }

    async deleteSetting(id: string): Promise<StandardResponse<null>> {
        return this.request<null>(`/setting/${id}/delete`, 'POST');
    }
}

// Export the class for instantiation in the context
export default ApiClient;
