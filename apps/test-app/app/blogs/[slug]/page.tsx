import {notFound} from "next/navigation";
import {
    AuthorBio,
    BlogAuthor,
    BlogContent,
    BlogMeta,
    BlogTitle,
    FeaturedMedia,
    RelatedBlogs,
    SEO
} from '@supergrowthai/next-blog-ui';
import '@supergrowthai/next-blog-ui/style.css';
import {dbProvider} from "@/lib/db";
import {SEOAnalyzer} from "../_components/seo/SEOAnalyzer";
import nextBlogConfig from "@/lib/next-blog-config";

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getHydratedBlog({slug});

    if (blog?.status !== "published")
        return notFound();

    const relatedBlogs = await blogDb.generated.getRelatedBlogs(blog._id, 3)

    return (
        <>
            {/* SEO Component would normally go in <head> */}
            <div style={{display: 'none'}}>
                <SEO
                    entity={blog}
                    entityType="blog"
                    config={nextBlogConfig()}
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
                        columns={{sm: 1, md: 2}}
                    />
                )}

                <SEOAnalyzer/>
            </article>
        </>
    );
}