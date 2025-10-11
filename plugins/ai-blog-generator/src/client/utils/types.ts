export type AIProvider = 'openai' | 'grok' | 'gemini';

export interface BlogGenerationSettings {
    aiProvider: AIProvider;
    dailyLimit: number;
    topics: string[];
    customPrompt?: string;
    lastBlogCreated: number;
    blogsCreatedToday: number;
}

export interface PluginStatus {
    hasApiKey: boolean;
    aiProvider: AIProvider;
    openaiApiKey: string;
    grokApiKey: string;
    geminiApiKey: string;
    dailyLimit: number;
    topics: string[];
    customPrompt: string;
    blogsCreatedToday: number;
    lastBlogCreated: number;
    canGenerateMore: boolean;
}

export interface RecentBlog {
    id: string;
    title: string;
    status: string;
    createdAt: number;
    topic?: string;
    slug: string;
}