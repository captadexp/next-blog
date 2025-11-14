import {notFound} from "next/navigation";
import {Metadata} from "next";
import {
    AuthorBio,
    BlogAuthor,
    BlogContent,
    BlogMeta,
    BlogTitle,
    FeaturedMedia,
    generateJsonLd,
    getPermalink,
    RelatedBlogs
} from '@supergrowthai/next-blog-ui';
import '@supergrowthai/next-blog-ui/style.css';
import {dbProvider} from "@/lib/db";
import {SEOAnalyzer} from "../_components/seo/SEOAnalyzer";
import nextBlogConfig from "@/lib/next-blog-config";
import {createServerSDK} from "@supergrowthai/next-blog/next";

/**
 * Server-side metadata generation for blog pages.
 *
 * Best practices:
 * - Use generateMetadata() for Next.js SEO optimization
 * - Extract permalink from entity metadata (permalink-manager plugin)
 * - Handle null cases gracefully (blog not found)
 * - Use server-side data available during SSR
 */
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getHydratedBlog({slug});

    if (!blog) {
        return {
            title: 'Blog Not Found'
        };
    }

    const config = nextBlogConfig();
    const sdk = await createServerSDK(config);

    // Generate JSON-LD to get website base URL
    const jsonLd = await generateJsonLd({entity: blog, entityType: 'blog', sdk}).catch(() => null);

    // Extract permalink from permalink-manager plugin (usually returns relative path)
    const permalink = getPermalink(blog);

    // Simple approach: Look for @type: 'WebSite' in JSON-LD to get base URL
    let canonicalUrl: string | undefined;

    if (permalink) {
        if (jsonLd) {
            // Look for website URL in JSON-LD
            const websiteUrl = Array.isArray(jsonLd)
                ? jsonLd.find(item => item['@type'] === 'WebSite')?.url
                : jsonLd['@type'] === 'WebSite' ? jsonLd.url : null;

            if (websiteUrl) {
                canonicalUrl = new URL(permalink, websiteUrl).href;
            } else {
                console.warn('No WebSite type found in JSON-LD, cannot construct canonical URL. Install plugin json-ld and update the settings');
            }
        }
    }

    return {
        title: blog.title,
        description: blog.excerpt,
        openGraph: {
            title: blog.title,
            description: blog.excerpt,
            type: 'article',
            url: canonicalUrl || undefined,
            images: blog.featuredMedia?.url ? [blog.featuredMedia.url] : [],
        },
        twitter: {
            card: blog.featuredMedia?.url ? 'summary_large_image' : 'summary',
            title: blog.title,
            description: blog.excerpt,
            images: blog.featuredMedia?.url ? [blog.featuredMedia.url] : [],
        },
        // Set canonical URL if permalink is available
        alternates: canonicalUrl ? {
            canonical: canonicalUrl
        } : undefined,
    };
}

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getHydratedBlog({slug});

    if (blog?.status !== "published")
        return notFound();

    const relatedBlogs = await blogDb.generated.getRelatedBlogs(blog._id, 3);

    // Generate JSON-LD structured data server-side for better SEO performance
    // This calls the json-ld-structured-data plugin via RPC
    const sdk = await createServerSDK(nextBlogConfig());
    const jsonLd = await generateJsonLd({entity: blog, entityType: 'blog', sdk}).catch(() => null);

    return (
        <>
            {/* Inject JSON-LD structured data for rich search results */}
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
                />
            )}

            <article style={{maxWidth: '800px', margin: '0 auto', padding: '40px 20px'}}>
                {/* Blog Header */}
                <header style={{marginBottom: '32px'}}>
                    <BlogTitle blog={blog}/>
                    <BlogMeta blog={blog} showReadTime={true} style={{marginTop: '16px'}}/>
                    <BlogAuthor
                        blog={blog}
                        showAvatar={true}
                        style={{marginTop: '16px'}}
                    />
                </header>

                {/* Featured Image */}
                {blog.featuredMedia?.url && (
                    <FeaturedMedia
                        blog={blog}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            marginBottom: '32px'
                        }}
                    />
                )}

                {/* Blog Content */}
                <BlogContent blog={blog}/>

                {/* Author Bio */}
                <div style={{marginTop: '48px', marginBottom: '48px'}}>
                    <AuthorBio
                        author={blog.user}
                        socialLinks={{
                            twitter: blog.user?.metadata?.["twitter"] || '', //todo dummy for now. can replace with actual plugin data later
                            linkedin: blog.user?.metadata?.["linkedin"] || '',
                            github: blog.user?.metadata?.["github"] || '',
                            website: blog.user?.metadata?.["website"] || ''
                        }}
                    />
                </div>

                {/* Related Posts */}
                {relatedBlogs.length > 0 && (
                    <RelatedBlogs
                        blogs={relatedBlogs}
                        currentBlogId={blog._id}
                        title="You Might Also Like"
                        layout="cards"
                        columns={{sm: 1, md: 2}}
                    />
                )}

                <SEOAnalyzer/>
            </article>
        </>
    );
}