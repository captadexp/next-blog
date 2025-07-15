import {notFound} from "next/navigation";
import {
    Header,
    RecentPosts,
    RelatedPosts,
    Content,
    AuthorInfo,
    BlogLayout,
    MainSection,
    Aside
} from "@supergrowthai/next-blog-ui";
import '@supergrowthai/next-blog-ui/dist/index.css';
import styles from './page.module.css';
import {dbProvider} from "@/lib/db";
import {SEOAnalyzer} from "../_components/seo/SEOAnalyzer";

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getDetailedBlogObject({slug});

    if (blog?.status !== "published")
        return notFound();

    return (
        <BlogLayout>
            <BlogLayout.Header>
                <Header db={blogDb} blog={blog}/>
            </BlogLayout.Header>
            <BlogLayout.Body>
                <MainSection>
                    <Content db={blogDb} blog={blog}/>
                    <AuthorInfo db={blogDb} blog={blog}/>
                    <SEOAnalyzer blog={blog}/>
                </MainSection>
                <Aside>
                    <RelatedPosts db={blogDb} blog={blog}/>
                    <RecentPosts db={blogDb} blog={blog}/>
                </Aside>
            </BlogLayout.Body>
            <BlogLayout.Footer>
                <footer className={styles.footer}>
                    © {new Date().getFullYear()} Next-Blog. All rights reserved.
                </footer>
            </BlogLayout.Footer>
        </BlogLayout>
    );
}