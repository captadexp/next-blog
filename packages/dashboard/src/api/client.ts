import type {
    APIClient,
    APIResponse,
    Blog,
    Category,
    ClientPaginationParams,
    Media,
    PaginatedResponse,
    Permission,
    Plugin,
    PluginHookMapping,
    SettingsEntry,
    Tag,
    UIConfiguration,
    User
} from '@supergrowthai/next-blog-types';

class ApiClientImpl implements APIClient {
    private readonly baseUrl: string;
    private readonly defaultHeaders: Record<string, string>;

    constructor(baseUrl: string = '/api', defaultHeaders: Record<string, string> = {}) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = defaultHeaders;
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
    async getBlogs(params?: ClientPaginationParams): Promise<APIResponse<PaginatedResponse<Blog>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<Blog>>(`/blogs${queryString}`);
    }

    async getBlog(id: string): Promise<APIResponse<Blog>> {
        return this.request<Blog>(`/blogs/${id}`);
    }

    async createBlog(data: {
        title: string;
        slug: string;
        content: string;
        status: 'draft' | 'published';
        categoryId: string;
        tagIds: string[];
        excerpt?: string;
        featuredMediaId?: string;
        metadata?: Record<string, any>;
    }): Promise<APIResponse<Blog>> {
        return this.request<Blog>('/blogs/create', 'POST', data);
    }

    async updateBlog(id: string, data: {
        title?: string;
        slug?: string;
        content?: string;
        excerpt?: string;
        categoryId?: string;
        tagIds?: string[];
        status?: 'draft' | 'pending' | 'private' | 'published' | 'trash';
        featuredMediaId?: string;
    }): Promise<APIResponse<Blog>> {
        return this.request<Blog>(`/blog/${id}/update`, 'POST', data);
    }

    async deleteBlog(id: string): Promise<APIResponse<null>> {
        return this.request<null>(`/blog/${id}/delete`, 'POST');
    }

    // User APIs
    async getUsers(params?: ClientPaginationParams): Promise<APIResponse<PaginatedResponse<User>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<User>>(`/users${queryString}`);
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
    async getCategories(params?: ClientPaginationParams & {
        search?: string;
        ids?: string
    }): Promise<APIResponse<PaginatedResponse<Category>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<Category>>(`/categories${queryString}`);
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
    async getTags(params?: ClientPaginationParams & {
        search?: string;
        ids?: string
    }): Promise<APIResponse<PaginatedResponse<Tag>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<Tag>>(`/tags${queryString}`);
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
    async getSettings(params?: ClientPaginationParams & {
        search?: string;
    }): Promise<APIResponse<PaginatedResponse<SettingsEntry>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<SettingsEntry>>(`/settings${queryString}`);
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
    async getPlugins(params?: ClientPaginationParams): Promise<APIResponse<PaginatedResponse<Plugin>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PaginatedResponse<Plugin>>(`/plugins${queryString}`);
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
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return this.request<PluginHookMapping[]>(`/plugin-hooks${queryString}`);
    }

    async callPluginHook<TPayload = any, TResponse = any>(hookName: string, payload: TPayload): Promise<TResponse> {
        return this.request<any>(`/plugin/hook/${hookName}`, 'POST', payload) as any;
    }

    async callPluginRPC<TPayload = any, TResponse = any>(rpcName: string, payload: TPayload): Promise<TResponse> {
        return this.request<any>(`/plugin/rpc/${rpcName}`, 'POST', payload) as any;
    }

    // Media APIs
    async getMedia(params?: ClientPaginationParams & {
        mimeType?: string;
        userId?: string;
    }): Promise<APIResponse<PaginatedResponse<Media>>> {
        const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>) : '';
        return this.request<PaginatedResponse<Media>>(`/media${queryString}`);
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

        return this.request<Media>(`/media/upload/${mediaId}`, "POST", formData, {"Content-Type": undefined});
    }

    getCsrfHeaders(): {} {
        const csrf = document.cookie.split("; ").find(c => c.startsWith("csrf="))?.split("=")[1] ?? "";
        if (csrf)
            return {"x-csrf-token": csrf}
        return {};
    }

    private async request<TResponsePayload, BODY = any, HEADERS = any>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: BODY,
        extraHeaders?: HEADERS
    ): Promise<APIResponse<TResponsePayload>> {

        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...this.getCsrfHeaders(),
            ...extraHeaders,
            ...this.defaultHeaders,
        };

        const options: RequestInit = {
            method,
            headers,
            credentials: 'include',
        };

        if (body && method !== 'GET') {
            if (body instanceof FormData) {
                options.body = body;
                delete headers['Content-Type'];
            } else {
                options.body = JSON.stringify(body);
            }
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

export default ApiClientImpl;
