import {BlogGrid, CategoryList, RecentBlogs, TagCloud} from '@supergrowthai/next-blog-ui';
import {getTestBlogs, getTestCategories, getTestTags} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function LandingPageTestPage() {
    const blogs = await getTestBlogs(12);
    const categories = await getTestCategories();
    const tags = await getTestTags();

    // Add mock counts to tags for TagCloud
    const tagsWithCount = tags.map((tag, index) => ({
        ...tag,
        count: Math.floor(Math.random() * 20) + 1
    }));

    const baseUrl = 'https://example.com';
    const siteName = 'Test Blog Site';

    return (
        <>
            <div style={{minHeight: '100vh'}}>
                {/* Hero Section */}
                <header style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <h1 style={{fontSize: '48px', marginBottom: '16px'}}>Welcome to Test Blog</h1>
                    <p style={{fontSize: '20px', maxWidth: '600px', margin: '0 auto'}}>
                        Discover insightful articles about technology, design, and more
                    </p>
                </header>

                {/* Featured Posts */}
                <section style={{padding: '60px 20px'}}>
                    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                        <h2 style={{fontSize: '36px', textAlign: 'center', marginBottom: '40px'}}>
                            Featured Articles
                        </h2>
                        <BlogGrid blogs={blogs.slice(0, 3)} columns={{sm: 1, md: 2, lg: 3}}/>
                    </div>
                </section>

                {/* Recent Posts */}
                <section style={{padding: '60px 20px', backgroundColor: '#f9fafb'}}>
                    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                        <RecentBlogs
                            blogs={blogs}
                            title="Latest Posts"
                            limit={6}
                            columns={{sm: 1, md: 2}}
                        />
                    </div>
                </section>

                {/* Categories and Tags */}
                <section style={{padding: '60px 20px'}}>
                    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px'}}>
                            {/* Categories */}
                            <div>
                                <h2 style={{fontSize: '28px', marginBottom: '24px'}}>Browse by Category</h2>
                                <CategoryList categories={categories} layout="cards" columns={{sm: 1, md: 2}}/>
                            </div>

                            {/* Tag Cloud */}
                            <div>
                                <h2 style={{fontSize: '28px', marginBottom: '24px'}}>Popular Tags</h2>
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <TagCloud tags={tagsWithCount} minFontSize={12} maxFontSize={28}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* More Posts */}
                <section style={{padding: '60px 20px', backgroundColor: '#f9fafb'}}>
                    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                        <h2 style={{fontSize: '36px', textAlign: 'center', marginBottom: '40px'}}>
                            More Articles
                        </h2>
                        <BlogGrid blogs={blogs.slice(6, 12)} columns={{sm: 1, md: 2, lg: 3}} showExcerpt={false}/>
                    </div>
                </section>
            </div>
        </>
    );
}