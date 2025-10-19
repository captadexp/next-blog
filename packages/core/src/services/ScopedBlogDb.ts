import type {DatabaseAdapter} from '@supergrowthai/next-blog-types/server';
import {applyMetadataScoping} from './MetadataScopingHelper.js';

/**
 * Creates a scoped blog database collection that automatically handles metadata scoping
 * @param originalBlogs - The original blogs collection from DatabaseAdapter
 * @param pluginId - The plugin ID for scoping metadata
 * @returns Scoped blogs collection
 */
export function createScopedBlogDb(
    originalBlogs: DatabaseAdapter['blogs'],
    pluginId: string
): DatabaseAdapter['blogs'] {
    return {
        ...originalBlogs,

        // Override updateOne to handle metadata scoping
        updateOne: async (filter: any, update: any) => {
            if (update.metadata) {
                const {metadata, ...otherUpdates} = update;

                // Get the current blog to merge metadata properly
                const blog = await originalBlogs.findOne(filter);
                if (!blog) throw new Error('Blog not found');

                // Apply smart scoping
                const scopedMetadata = applyMetadataScoping(metadata, {pluginId});

                const finalMetadata = {
                    ...blog.metadata,
                    ...scopedMetadata
                };

                return originalBlogs.updateOne(filter, {
                    ...otherUpdates,
                    metadata: finalMetadata,
                    updatedAt: Date.now()
                });
            }
            return originalBlogs.updateOne(filter, update);
        },

        // Override create to handle metadata scoping
        create: async (data: any) => {
            if (data.metadata) {
                const {metadata, ...otherData} = data;

                // Apply smart scoping
                const scopedMetadata = applyMetadataScoping(metadata, {pluginId});

                return originalBlogs.create({
                    ...otherData,
                    metadata: scopedMetadata
                });
            }
            return originalBlogs.create(data);
        }
    };
}