import type {ServerSDK} from '@supergrowthai/next-blog-types';

type EntityType = 'blog' | 'user' | 'category' | 'tag';

/**
 * Generates JSON-LD structured data for an entity using the json-ld-structured-data plugin.
 *
 * This function calls the plugin via RPC to generate Schema.org compliant JSON-LD markup
 * that can be embedded in HTML for improved SEO and rich search results.
 *
 * @param params - Configuration object
 * @param params.entity - The entity to generate JSON-LD for (blog, user, category, or tag)
 * @param params.entityType - The type of entity ('blog' | 'user' | 'category' | 'tag')
 * @param params.sdk - Server-side SDK instance for making RPC calls
 * @returns Promise that resolves to JSON-LD object or null if generation fails
 *
 * @example
 * ```tsx
 * const sdk = await createServerSDK(config);
 * const jsonLd = await generateJsonLd({
 *   entity: blog,
 *   entityType: 'blog',
 *   sdk
 * });
 *
 * if (jsonLd) {
 *   return (
 *     <script
 *       type="application/ld+json"
 *       dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 *     />
 *   );
 * }
 * ```
 *
 * @requires json-ld-structured-data plugin to be installed and active
 */
export async function generateJsonLd({entity, entityType, sdk}: {
    entity: any,
    entityType: EntityType,
    sdk: ServerSDK
}): Promise<any | null> {
    const response = await sdk
        .callRPC('json-ld-structured-data:generateJsonLd', {
            entityType,
            entity
        })
        .catch(() => ({code: -1, message: 'RPC call failed'}));

    if (response.code !== 0) {
        return null;
    }

    return response.payload;
}