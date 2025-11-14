import {
    AuthorBio,
    BlogAuthor,
    BlogContent,
    BlogMeta,
    BlogTitle,
    FeaturedMedia,
    generateJsonLd,
    RelatedBlogs
} from '@supergrowthai/next-blog-ui';
import {getRelatedTestBlogs, getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css"
import nextBlogConfig from "@/lib/next-blog-config";
import {createServerSDK} from "@supergrowthai/next-blog/next";

const config = nextBlogConfig();

export default async function BlogPageTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    const relatedBlogs = await getRelatedTestBlogs(blog._id);

    // Generate JSON-LD for structured data
    const sdk = await createServerSDK(config);
    const jsonLd = await generateJsonLd({entity: blog, entityType: 'blog', sdk}).catch(() => null);

    return (
        <>
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
                        }}/>
                )}

                {/* Blog Content */}
                <BlogContent blog={blog}/>

                {/* Author Bio */}
                <div style={{marginTop: '48px', marginBottom: '48px'}}>
                    <AuthorBio
                        author={blog.user}
                        socialLinks={{
                            twitter: 'https://twitter.com/author',
                            linkedin: 'https://linkedin.com/in/author',
                            github: 'https://github.com/author',
                            website: 'https://author.com'
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
                        columns={{sm: 1, md: 2, lg: 2}}
                    />
                )}
            </article>
        </>
    );
}