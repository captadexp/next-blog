import {notFound} from "next/navigation";
import {
    AuthorBio,
    BlogAuthor,
    BlogContent,
    BlogMeta,
    BlogTitle,
    Canonical,
    FeaturedMedia,
    JsonLd,
    MetaTags,
    RelatedBlogs
} from '@supergrowthai/next-blog-ui';
import '@supergrowthai/next-blog-ui/style.css';
import {dbProvider} from "@/lib/db";
import {SEOAnalyzer} from "../_components/seo/SEOAnalyzer";

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getHydratedBlog({slug});

    if (blog?.status !== "published")
        return notFound();

    const relatedBlogs = await blogDb.generated.getRelatedBlogs(blog._id, 3)

    const baseUrl = 'https://next-blog-test-app.vercel.app';
    const siteName = 'Next-Blog';

    return (
        <>
            {/* SEO Components would normally go in <head> */}
            <div style={{display: 'none'}}>
                <MetaTags
                    type="blog"
                    blog={blog}
                    baseUrl={baseUrl}
                    siteName={siteName}
                    twitterHandle="@nextblog"
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
                        columns={2}
                    />
                )}

                <SEOAnalyzer/>
            </article>
        </>
    );
}