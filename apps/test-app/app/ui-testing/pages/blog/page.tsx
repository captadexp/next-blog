import {
    AuthorBio,
    BlogAuthor,
    BlogContent,
    BlogMeta,
    BlogTitle,
    Canonical,
    JsonLd,
    MetaTags,
    RelatedBlogs
} from '@supergrowthai/next-blog-ui';
import {getRelatedTestBlogs, getTestBlog} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css"

export default async function BlogPageTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    const relatedBlogs = await getRelatedTestBlogs(blog._id);

    const baseUrl = 'https://example.com';
    const siteName = 'Test Blog Site';

    return (
        <>
            {/* SEO Components would normally go in <head> */}
            <div style={{display: 'none'}}>
                <MetaTags
                    type="blog"
                    blog={blog}
                    baseUrl={baseUrl}
                    siteName={siteName}
                    twitterHandle="@testblog"
                />
                <Canonical
                    url={`${baseUrl}/${blog.slug}`}
                    hrefLang="en"
                />
                <JsonLd
                    blog={blog}
                    organization={{
                        name: siteName,
                        url: baseUrl,
                        logo: `${baseUrl}/logo.png`
                    }}
                    website={{
                        name: siteName,
                        url: baseUrl,
                        searchAction: true
                    }}
                />
            </div>

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
                    <img
                        src={blog.featuredMedia.url}
                        alt={blog.title}
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
                        columns={2}
                    />
                )}
            </article>
        </>
    );
}