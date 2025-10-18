import Link from 'next/link';

export default function UITestingPage() {
    const componentGroups = [
        {
            title: 'Blog Components',
            items: [
                {name: 'BlogTitle', href: '/ui-testing/blog/title'},
                {name: 'BlogContent', href: '/ui-testing/blog/content'},
                {name: 'BlogAuthor', href: '/ui-testing/blog/author'},
                {name: 'BlogMeta', href: '/ui-testing/blog/meta'},
                {name: 'BlogExcerpt', href: '/ui-testing/blog/excerpt'},
            ]
        },
        {
            title: 'Tag Components',
            items: [
                {name: 'TagList', href: '/ui-testing/tags/list'},
                {name: 'TagCard', href: '/ui-testing/tags/card'},
                {name: 'TagCloud', href: '/ui-testing/tags/cloud'},
                {name: 'TagArticles', href: '/ui-testing/tags/articles'},
            ]
        },
        {
            title: 'Category Components',
            items: [
                {name: 'CategoryList', href: '/ui-testing/categories/list'},
                {name: 'CategoryCard', href: '/ui-testing/categories/card'},
                {name: 'CategoryTree', href: '/ui-testing/categories/tree'},
                {name: 'CategoryArticles', href: '/ui-testing/categories/articles'},
            ]
        },
        {
            title: 'Author Components',
            items: [
                {name: 'AuthorCard', href: '/ui-testing/authors/card'},
                {name: 'AuthorBio', href: '/ui-testing/authors/bio'},
                {name: 'AuthorArticles', href: '/ui-testing/authors/articles'},
                {name: 'AuthorList', href: '/ui-testing/authors/list'},
            ]
        },
        {
            title: 'General Components',
            items: [
                {name: 'BlogCard', href: '/ui-testing/general/blog-card'},
                {name: 'BlogGrid', href: '/ui-testing/general/blog-grid'},
                {name: 'Pagination', href: '/ui-testing/general/pagination'},
                {name: 'RecentBlogs', href: '/ui-testing/general/recent-blogs'},
                {name: 'RelatedBlogs', href: '/ui-testing/general/related-blogs'},
            ]
        },
        {
            title: 'SEO Components',
            items: [
                {name: 'MetaTags', href: '/ui-testing/seo/meta-tags'},
                {name: 'JsonLd', href: '/ui-testing/seo/json-ld'},
                {name: 'Canonical', href: '/ui-testing/seo/canonical'},
            ]
        },
        {
            title: 'Page Components',
            items: [
                {name: 'Landing Page', href: '/ui-testing/pages/landing'},
                {name: 'Blog Page', href: '/ui-testing/pages/blog'},
                {name: 'Category Page', href: '/ui-testing/pages/category'},
                {name: 'Tag Page', href: '/ui-testing/pages/tag'},
                {name: 'Author Page', href: '/ui-testing/pages/author'},
            ]
        },
    ];

    return (
        <div style={{padding: '40px', maxWidth: '1200px', margin: '0 auto'}}>
            <h1 style={{fontSize: '36px', marginBottom: '40px'}}>UI Component Testing</h1>

            {componentGroups.map((group, index) => (
                <div key={index} style={{marginBottom: '40px'}}>
                    <h2 style={{fontSize: '24px', marginBottom: '20px', color: '#1f2937'}}>
                        {group.title}
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px'
                    }}>
                        {group.items.map((item, idx) => (
                            <Link
                                key={idx}
                                href={item.href}
                                style={{
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: '#2563eb',
                                    border: '1px solid #e5e7eb',
                                    display: 'block',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}