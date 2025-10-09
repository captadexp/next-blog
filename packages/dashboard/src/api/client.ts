import type {
    APIClient,
    APIResponse,
    Blog,
    Category,
    Media,
    Permission,
    Plugin,
    PluginHookMapping,
    SettingsEntry,
    Tag,
    UIConfiguration,
    User
} from '@supergrowthai/types';

class ApiClientImpl implements APIClient {
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

    // Auth APIs
    async login(username: string, password: string): Promise<APIResponse<User>> {
        return this.request<User>('/login', 'POST', {username, password});
    }

    async logout(): Promise<APIResponse<null>> {
        return this.request<null>('/logout', 'POST');
    }

    async getCurrentUser(): Promise<APIResponse<User>> {
        return this.request<User>('/me');
    }

    async checkPermission(permission: Permission): Promise<APIResponse<boolean>> {
        return this.request<boolean>('/check-permission', 'POST', {permission});
    }

    // Config API
    async getConfig(): Promise<APIResponse<UIConfiguration>> {
        return this.request('/config');
    }

    // Blog APIs
    async getBlogs(): Promise<APIResponse<Blog[]>> {
        return this.request<Blog[]>('/blogs');
    }

    async getBlog(id: string): Promise<APIResponse<Blog>> {
        return this.request<Blog>(`/blogs/${id}`);
    }

    async createBlog(data: {
        title: string;
        slug: string;
        content: string;
        status: 'draft' | 'published';
        category: string;
        tags: string[];
        excerpt?: string;
        featuredImage?: string;
        metadata?: Record<string, any>;
    }): Promise<APIResponse<Blog>> {
        return this.request<Blog>('/blogs/create', 'POST', data);
    }

    async updateBlog(id: string, data: {
        title?: string;
        slug?: string;
        content?: string;
        excerpt?: string;
        category?: string;
        tags?: string[];
        status?: 'draft' | 'pending' | 'private' | 'published' | 'trash';
        featuredImage?: string;
    }): Promise<APIResponse<Blog>> {
        return this.request<Blog>(`/blog/${id}/update`, 'POST', data);
    }

    async updateBlogMetadata(id: string, metadata: Record<string, any>): Promise<APIResponse<Blog>> {
        return this.request<Blog>(`/blog/${id}/update-metadata`, 'POST', {metadata});
    }

    async deleteBlog(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/blog/${id}/delete`, 'POST');
    }

    // User APIs
    async getUsers(): Promise<APIResponse<User[]>> {
        return this.request<User[]>('/users');
    }

    async getUser(id: string): Promise<APIResponse<User>> {
        return this.request<User>(`/users/${id}`);
    }

    async createUser(data: {
        username: string;
        email: string;
        password: string;
        name: string;
        slug: string;
        bio: string;
        permissions?: Permission[];
    }): Promise<APIResponse<User>> {
        return this.request<User>('/users/create', 'POST', data);
    }

    async updateUser(id: string, data: {
        username?: string;
        email?: string;
        password?: string;
        name?: string;
        slug?: string;
        bio?: string;
        permissions?: Permission[];
    }): Promise<APIResponse<User>> {
        return this.request<User>(`/user/${id}/update`, 'POST', data);
    }

    async deleteUser(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/user/${id}/delete`, 'POST');
    }

    // Permissions
    async getAllPermissions(): Promise<APIResponse<Permission[]>> {
        return this.request<Permission[]>('/permissions');
    }

    // Category APIs
    async getCategories(): Promise<APIResponse<Category[]>> {
        return this.request<Category[]>('/categories');
    }

    async getCategory(id: string): Promise<APIResponse<Category>> {
        return this.request<Category>(`/categories/${id}`);
    }

    async createCategory(data: {
        name: string;
        description: string;
        slug: string;
    }): Promise<APIResponse<Category>> {
        return this.request<Category>('/categories/create', 'POST', data);
    }

    async updateCategory(id: string, data: {
        name?: string;
        description?: string;
        slug?: string;
    }): Promise<APIResponse<Category>> {
        return this.request<Category>(`/category/${id}/update`, 'POST', data);
    }

    async deleteCategory(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/category/${id}/delete`, 'POST');
    }

    // Tag APIs
    async getTags(): Promise<APIResponse<Tag[]>> {
        return this.request<Tag[]>('/tags');
    }

    async getTag(id: string): Promise<APIResponse<Tag>> {
        return this.request<Tag>(`/tags/${id}`);
    }

    async createTag(data: {
        name: string;
        slug: string;
    }): Promise<APIResponse<Tag>> {
        return this.request<Tag>('/tags/create', 'POST', data);
    }

    async updateTag(id: string, data: {
        name?: string;
        slug?: string;
    }): Promise<APIResponse<Tag>> {
        return this.request<Tag>(`/tag/${id}/update`, 'POST', data);
    }

    async deleteTag(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/tag/${id}/delete`, 'POST');
    }

    // Settings APIs
    async getSettings(): Promise<APIResponse<SettingsEntry[]>> {
        return this.request<SettingsEntry[]>('/settings');
    }

    async getSetting(id: string): Promise<APIResponse<SettingsEntry>> {
        return this.request<SettingsEntry>(`/settings/${id}`);
    }

    async createSetting(data: {
        key: string;
        value: string | boolean | number | boolean[] | string[] | number[];
        scope?: 'global' | 'user';
        isSecure?: boolean;
    }): Promise<APIResponse<SettingsEntry>> {
        return this.request<SettingsEntry>('/settings/create', 'POST', data);
    }

    async updateSetting(id: string, data: {
        key?: string;
        value?: string | boolean | number | boolean[] | string[] | number[];
    }): Promise<APIResponse<SettingsEntry>> {
        return this.request<SettingsEntry>(`/setting/${id}/update`, 'POST', data);
    }

    async deleteSetting(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/setting/${id}/delete`, 'POST');
    }

    // Plugin APIs
    async getPlugins(): Promise<APIResponse<Plugin[]>> {
        return this.request<Plugin[]>('/plugins');
    }

    async getPlugin(id: string): Promise<APIResponse<Plugin>> {
        return this.request<Plugin>(`/plugins/${id}`);
    }

    async createPlugin(data: {
        url: string;
    }): Promise<APIResponse<Plugin>> {
        return this.request<Plugin>('/plugins/create', 'POST', data);
    }

    async updatePlugin(id: string, data: {
        name?: string;
        description?: string;
        version?: string;
        url?: string;
        author?: string;
    }): Promise<APIResponse<Plugin>> {
        return this.request<Plugin>(`/plugin/${id}/update`, 'POST', data);
    }

    async deletePlugin(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/plugin/${id}/delete`, 'POST');
    }

    async reinstallPlugin(id: string): Promise<APIResponse<{ clearCache: boolean }>> {
        return this.request<{ clearCache: boolean }>(`/plugin/${id}/reinstall`, 'POST');
    }

    // Plugin Hook Mapping APIs
    async getPluginHookMappings(params?: {
        type: 'client' | 'server' | 'rpc'
    }): Promise<APIResponse<PluginHookMapping[]>> {
        const endpoint = new URLSearchParams(params).toString();
        return this.request<PluginHookMapping[]>(`/plugin-hooks?${endpoint}`);
    }

    async callPluginHook<TPayload = any, TResponse = any>(pluginId: string, hookName: string, payload: TPayload): Promise<TResponse> {
        return this.request<any>(`/plugin/hook/${hookName}`, 'POST', payload, {"X-Calling-Plugin-Id": pluginId}) as any;
    }

    async callPluginRPC<TPayload = any, TResponse = any>(pluginId: string, rpcName: string, payload: TPayload): Promise<TResponse> {
        return this.request<any>(`/plugin/rpc/${rpcName}`, 'POST', payload, {"X-Calling-Plugin-Id": pluginId}) as any;
    }

    // Media APIs
    async getMedia(params?: {
        mimeType?: string;
        userId?: string;
        limit?: number;
        offset?: number;
    }): Promise<APIResponse<Media[]>> {
        const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
        return this.request<Media[]>(`/media${queryString}`);
    }

    async getMediaById(id: string): Promise<APIResponse<Media>> {
        return this.request<Media>(`/media/${id}`);
    }

    async createMedia(data: {
        filename: string;
        url: string;
        mimeType: string;
        size?: number;
        dimensions?: {
            width: number;
            height: number;
        };
        metadata?: Record<string, any>;
    }): Promise<APIResponse<Media>> {
        return this.request<Media>('/media/create', 'POST', data);
    }

    async updateMedia(id: string, data: {
        filename?: string;
        url?: string;
        mimeType?: string;
        size?: number;
        dimensions?: {
            width: number;
            height: number;
        };
        metadata?: Record<string, any>;
    }): Promise<APIResponse<Media>> {
        return this.request<Media>(`/media/${id}`, 'POST', data);
    }

    async deleteMedia(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/media/delete/${id}`, 'POST');
    }

    async uploadMediaFile(mediaId: string, file: File): Promise<APIResponse<Media>> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/media/upload/${mediaId}`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const result = await response.json();
        return result as APIResponse<Media>;
    }

    private async request<TResponsePayload, BODY = any, HEADERS = any>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: BODY,
        extraHeaders?: HEADERS
    ): Promise<APIResponse<TResponsePayload>> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            ...extraHeaders,
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
            const data: APIResponse<TResponsePayload> = await response.json();

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return {
                code: 500,
                message: 'API request failed'
            };
        }
    }
}

// Export the class for instantiation in the context
export default ApiClientImpl;
