import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {LlmsData, LlmsSection, SeoHookPayloadWithDb, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {contentObjectToPlainText} from "@supergrowthai/plugin-dev-kit/content";

export default defineServer({
    hooks: {
        'seo:llms.txt': async (sdk: ServerSDK, payload: SeoHookPayloadWithDb): Promise<{ data: LlmsData }> => {
            sdk.log.info('Generating llms.txt');

            // Fetch recent published blogs
            const blogs = await payload.db.blogs.find(
                {status: 'published'},
                {sort: {createdAt: -1}, limit: 10}
            );

            // Fetch categories for context
            const categories = await payload.db.categories.find({});

            const sections: LlmsSection[] = [
                {
                    title: 'About This Site',
                    content: `This is a blog site with ${blogs.length} recent posts across ${categories.length} categories. The content covers various topics and insights.`
                },
                {
                    title: 'Categories',
                    content: categories.map(cat => `- ${cat.name}: ${cat.description || 'No description'}`).join('\n')
                }
            ];

            // Add recent blog summaries
            if (blogs.length > 0) {
                sections.push({
                    title: 'Recent Posts',
                    content: blogs.map(blog => {

                        const contentString = contentObjectToPlainText(blog.content);


                        const excerpt = blog.excerpt || contentString.substring(0, 200).replace(/[#*`]/g, '');
                        return `Title: ${blog.title}\nSlug: ${blog.slug}\nSummary: ${excerpt}\n`;
                    }).join('\n')
                });
            }

            // Cache the last generation time using settings
            await sdk.settings.set('seo-llms:last-generated', new Date().toISOString());

            return {
                data: {
                    sections
                }
            };
        }
    }
});