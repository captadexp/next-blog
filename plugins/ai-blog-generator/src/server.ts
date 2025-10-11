import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/types/server';
import {GoogleGenerativeAI} from '@google/generative-ai';
import OpenAI from 'openai';
import type {ContentObject} from '@supergrowthai/plugin-dev-kit/content';

type AIProvider = 'openai' | 'grok' | 'gemini';

interface BlogGenerationSettings {
    aiProvider: AIProvider;
    openaiApiKey?: string;
    grokApiKey?: string;
    geminiApiKey?: string;
    dailyLimit: number;
    topics: string[];
    customPrompt?: string;
    lastBlogCreated: number;
    blogsCreatedToday: number;
    twitterApiKey?: string;
}

async function getRandomTopic(topics: string[]): Promise<string> {
    if (topics.length === 0) {
        return 'Technology trends';
    }
    return topics[Math.floor(Math.random() * topics.length)];
}

const DEFAULT_PROMPT = `Generate a comprehensive blog post about "{topic}".

Please provide:
1. An engaging title (60-80 characters)
2. A brief excerpt/summary (150-200 words)
3. Full blog content (800-1500 words) with proper structure including introduction, main body with subheadings, and conclusion

Format the response as JSON with the following structure:
{
  "title": "Your engaging title here",
  "excerpt": "Brief summary here",
  "content": "Full blog content with proper markdown formatting"
}

Make the content engaging, informative, and SEO-friendly. Use markdown formatting for headings, lists, and emphasis.`;

async function generateBlogContent(
    topic: string,
    provider: AIProvider,
    apiKey: string,
    customPrompt?: string
): Promise<{ title: string; content: ContentObject; excerpt: string }> {
    // Use custom prompt if provided, otherwise use default
    const promptTemplate = customPrompt || DEFAULT_PROMPT;

    // Replace {topic} placeholder with actual topic
    const prompt = promptTemplate.replace(/\{topic\}/g, topic);

    let responseText: string;

    try {
        switch (provider) {
            case 'openai': {
                const openai = new OpenAI({ apiKey });
                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2000
                });
                responseText = completion.choices[0]?.message?.content || '';
                break;
            }

            case 'grok': {
                // Grok uses OpenAI-compatible API through xAI
                const grokClient = new OpenAI({
                    apiKey,
                    baseURL: 'https://api.x.ai/v1'
                });
                const completion = await grokClient.chat.completions.create({
                    model: "grok-beta",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2000
                });
                responseText = completion.choices[0]?.message?.content || '';
                break;
            }

            case 'gemini': {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                responseText = response.text();
                break;
            }

            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(`Invalid response format from ${provider}`);
        }

        const blogData = JSON.parse(jsonMatch[0]);

        // Convert markdown content to ContentObject format
        const contentObject: ContentObject = {
            version: 1,
            content: [
                {
                    name: 'Paragraph',
                    version: 1,
                    data: [
                        {
                            name: 'Text',
                            version: 1,
                            data: blogData.content
                        }
                    ]
                }
            ]
        };

        return {
            title: blogData.title,
            content: contentObject,
            excerpt: blogData.excerpt
        };
    } catch (error) {
        throw new Error(`Failed to generate blog content with ${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function shouldGenerateBlog(sdk: ServerSDK): Promise<boolean> {
    const settings = await sdk.settings.get<BlogGenerationSettings>('config') || {
        aiProvider: 'openai',
        dailyLimit: 2,
        topics: [],
        lastBlogCreated: 0,
        blogsCreatedToday: 0
    };

    const now = Date.now();
    const today = new Date(now).toDateString();
    const lastCreatedDate = new Date(settings.lastBlogCreated).toDateString();

    // Reset daily counter if it's a new day
    if (lastCreatedDate !== today) {
        settings.blogsCreatedToday = 0;
    }

    // Check if we've reached the daily limit
    if (settings.blogsCreatedToday >= settings.dailyLimit) {
        return false;
    }

    // Check if enough time has passed (distribute throughout the day)
    const hoursInDay = 24;
    const minutesBetweenBlogs = (hoursInDay * 60) / settings.dailyLimit;
    const timeSinceLastBlog = now - settings.lastBlogCreated;
    const minTimeBetweenBlogs = minutesBetweenBlogs * 60 * 1000; // Convert to milliseconds

    return timeSinceLastBlog >= minTimeBetweenBlogs;
}

export default defineServer({
    hooks: {
        'cron:5-minute': async (sdk, payload) => {
            try {
                sdk.log.info('AI Blog Generator: 5-minute cron triggered');

                // Check if we should generate a blog
                if (!(await shouldGenerateBlog(sdk))) {
                    sdk.log.debug('AI Blog Generator: Skipping generation - not time yet or daily limit reached');
                    return { success: true, message: 'Generation skipped - not time yet or daily limit reached' };
                }

                // Get plugin settings
                const settings = await sdk.settings.get<BlogGenerationSettings>('config') || {
                    aiProvider: 'openai',
                    dailyLimit: 2,
                    topics: ['Technology trends', 'AI and Machine Learning', 'Web Development'],
                    lastBlogCreated: 0,
                    blogsCreatedToday: 0
                };

                // Get API key based on provider from plugin settings
                let apiKey: string | null = null;
                let providerName: string;

                switch (settings.aiProvider) {
                    case 'openai':
                        apiKey = settings.openaiApiKey || null;
                        providerName = 'OpenAI';
                        break;
                    case 'grok':
                        apiKey = settings.grokApiKey || null;
                        providerName = 'Grok';
                        break;
                    case 'gemini':
                        apiKey = settings.geminiApiKey || null;
                        providerName = 'Gemini';
                        break;
                    default:
                        sdk.log.warn(`AI Blog Generator: Unsupported provider: ${settings.aiProvider}`);
                        return { success: false, message: `Unsupported AI provider: ${settings.aiProvider}` };
                }

                if (!apiKey) {
                    sdk.log.warn(`AI Blog Generator: No ${providerName} API key configured in plugin settings`);
                    return { success: false, message: `${providerName} API key not configured in plugin settings` };
                }

                // Select a random topic
                const topic = await getRandomTopic(settings.topics);
                sdk.log.info(`AI Blog Generator: Generating blog about "${topic}" using ${providerName}`);

                // Generate blog content using selected AI provider
                const blogContent = await generateBlogContent(topic, settings.aiProvider, apiKey, settings.customPrompt);

                // Create blog slug from title
                const slug = blogContent.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 50);

                // Get system user ID for blog creation
                const systemUser = await sdk.db.users.findOne({ username: 'system' });
                if (!systemUser) {
                    throw new Error('System user not found');
                }

                // Get default category
                const defaultCategory = await sdk.db.categories.findOne({}) || await sdk.db.categories.create({
                    name: 'AI Generated',
                    description: 'Content generated by AI',
                    slug: 'ai-generated'
                });

                // Create the blog as a draft with plugin metadata
                const newBlog = await sdk.db.blogs.create({
                    title: blogContent.title,
                    slug: slug,
                    content: blogContent.content,
                    excerpt: blogContent.excerpt,
                    categoryId: defaultCategory._id,
                    tagIds: [],
                    userId: systemUser._id,
                    status: 'draft', // Always save as draft for manual review
                    metadata: {
                        // Plugin identification meta tag
                        generatedBy: 'ai-blog-generator',
                        generatedByPlugin: 'AI Blog Generator',
                        aiProvider: settings.aiProvider,
                        aiProviderName: providerName,
                        pluginVersion: '1.0.0',
                        // Generation details
                        topic: topic,
                        generatedAt: Date.now(),
                        generationMethod: 'ai-automated',
                        // Mark for identification
                        aiGenerated: true,
                        requiresReview: true
                    }
                });

                // Update plugin settings
                const now = Date.now();
                const today = new Date(now).toDateString();
                const lastCreatedDate = new Date(settings.lastBlogCreated).toDateString();

                const updatedSettings = {
                    ...settings,
                    lastBlogCreated: now,
                    blogsCreatedToday: lastCreatedDate === today ? settings.blogsCreatedToday + 1 : 1
                };

                await sdk.settings.set('config', updatedSettings);

                sdk.log.info(`Gemini Blog Generator: Successfully created blog "${blogContent.title}" (ID: ${newBlog._id})`);

                return {
                    success: true,
                    message: `Generated blog: "${blogContent.title}"`,
                    blogId: newBlog._id,
                    topic: topic
                };

            } catch (error) {
                sdk.log.error('Gemini Blog Generator: Error during generation:', error);
                return {
                    success: false,
                    message: `Error: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    rpcs: {
        'ai-generator:getStatus': async (sdk: ServerSDK) => {
            const settings = await sdk.settings.get<BlogGenerationSettings>('config') || {
                aiProvider: 'openai',
                dailyLimit: 2,
                topics: [],
                lastBlogCreated: 0,
                blogsCreatedToday: 0
            };

            // Check API key based on current provider from plugin settings
            let apiKey: string | null = null;
            switch (settings.aiProvider) {
                case 'openai':
                    apiKey = settings.openaiApiKey || null;
                    break;
                case 'grok':
                    apiKey = settings.grokApiKey || null;
                    break;
                case 'gemini':
                    apiKey = settings.geminiApiKey || null;
                    break;
            }
            const hasApiKey = !!apiKey;

            const now = Date.now();
            const today = new Date(now).toDateString();
            const lastCreatedDate = new Date(settings.lastBlogCreated).toDateString();

            // Reset daily counter if it's a new day
            let blogsCreatedToday = settings.blogsCreatedToday;
            if (lastCreatedDate !== today) {
                blogsCreatedToday = 0;
            }

            return {
                hasApiKey,
                aiProvider: settings.aiProvider,
                openaiApiKey: settings.openaiApiKey || '',
                grokApiKey: settings.grokApiKey || '',
                geminiApiKey: settings.geminiApiKey || '',
                dailyLimit: settings.dailyLimit,
                topics: settings.topics,
                customPrompt: settings.customPrompt || DEFAULT_PROMPT,
                blogsCreatedToday,
                lastBlogCreated: settings.lastBlogCreated,
                canGenerateMore: blogsCreatedToday < settings.dailyLimit
            };
        },

        'ai-generator:updateSettings': async (sdk: ServerSDK, request: Partial<BlogGenerationSettings>) => {
            const currentSettings = await sdk.settings.get<BlogGenerationSettings>('config') || {
                aiProvider: 'openai',
                dailyLimit: 2,
                topics: [],
                lastBlogCreated: 0,
                blogsCreatedToday: 0
            };

            const updatedSettings = {
                ...currentSettings,
                ...request
            };

            await sdk.settings.set('config', updatedSettings);

            return { success: true, settings: updatedSettings };
        },

        'ai-generator:getRecentBlogs': async (sdk: ServerSDK) => {
            try {
                // Get recent blogs generated by this plugin (last 10)
                const recentBlogs = await sdk.db.blogs.find({});

                // Filter blogs generated by this plugin and sort by creation date
                const filteredBlogs = recentBlogs
                    .filter((blog: any) => blog.metadata?.generatedBy === 'ai-blog-generator')
                    .sort((a: any, b: any) => b.createdAt - a.createdAt)
                    .slice(0, 10);

                return {
                    blogs: filteredBlogs.map((blog: any) => ({
                        id: blog._id,
                        title: blog.title,
                        status: blog.status,
                        createdAt: blog.createdAt,
                        topic: blog.metadata?.topic,
                        slug: blog.slug
                    }))
                };
            } catch (error) {
                sdk.log.error('Failed to fetch recent blogs:', error);
                return { blogs: [] };
            }
        }
    }
});
