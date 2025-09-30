import Link from 'next/link';
import {dbProvider} from '@/lib/db';
import styles from './page.module.css';

export default async function Home() {
    const blogDb = await dbProvider();
    const posts = (await blogDb.blogs.find({}))
        .filter(blog => blog.status === 'published');

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContainer}>
                    <h1 className={styles.headerTitle}>
                        <Link href="/">Next-Blog</Link>
                    </h1>
                    <Link
                        href="/api/next-blog/dashboard"
                        className={styles.dashboardLink}
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <h2 className={styles.mainTitle}>
                    Welcome to Our Blog
                </h2>

                <div className={styles.infoBox}>
                    <p>This is a test application. Use the following credentials to access the dashboard:</p>
                    <p>
                        Username: <code>admin</code>
                    </p>
                    <p>
                        Password: <code>password</code>
                    </p>
                </div>

                {posts.length > 0 ? (
                    <div className={styles.postGrid}>
                        {posts.map((post) => (
                            <Link href={`/blogs/${post.slug}`} key={post._id}
                                  style={{textDecoration: 'none', color: 'inherit'}}>
                                <div className={styles.postCard}>
                                    <div className={styles.postCardContent}>
                                        <h3 className={styles.postCardTitle}>
                                            {post.title}
                                        </h3>
                                        <p className={styles.postCardExcerpt}>
                                            {post.excerpt}
                                        </p>
                                    </div>
                                    <div className={styles.postCardFooter}>
                                        <span className={styles.postCardLink}>
                                            Read more &rarr;
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className={styles.noPosts}>
                        <h3 className={styles.noPostsTitle}>No posts yet!</h3>
                        <p className={styles.noPostsText}>
                            Go to the dashboard to create your first blog post.
                        </p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    © {new Date().getFullYear()} Next-Blog. All rights reserved.
                </div>
            </footer>
        </div>
    );
}