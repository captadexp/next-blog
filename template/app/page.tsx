import Link from 'next/link';
import {dbProvider} from '../lib/db';
import styles from './page.module.css';

const writingTips = [
    {
        emoji: '✍️',
        title: 'Write like you talk',
        body: 'The best writing sounds like a real person. Drop the jargon, skip the fluff, and just say what you mean.',
    },
    {
        emoji: '📅',
        title: 'Consistency beats perfection',
        body: 'Posting something decent every week will always outperform the perfect post that never ships.',
    },
    {
        emoji: '✂️',
        title: 'Edit ruthlessly',
        body: 'Read it back. Cut the sentences you\'re most proud of. What\'s left is usually the good stuff.',
    },
];

const readingLinks = [
    {
        label: 'On Writing Well — William Zinsser',
        href: 'https://www.goodreads.com/book/show/53343.On_Writing_Well',
        desc: 'The classic guide to writing non-fiction with clarity and style.',
    },
    {
        label: 'The Elements of Style — Strunk & White',
        href: 'https://www.goodreads.com/book/show/33514.The_Elements_of_Style',
        desc: 'Short, sharp, and still the most useful writing rulebook around.',
    },
    {
        label: 'Bird by Bird — Anne Lamott',
        href: 'https://www.goodreads.com/book/show/12543.Bird_by_Bird',
        desc: 'A warm, funny take on writing — and the messy human process behind it.',
    },
    {
        label: 'Paul Graham\'s Writing Essays',
        href: 'https://paulgraham.com/articles.html',
        desc: 'Bite-sized essays on how to think clearly and write even more clearly.',
    },
];

export default async function Home() {
    const blogDb = await dbProvider();
    const posts = await blogDb.blogs.find({"status": "published"});

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContainer}>
                    <h1 className={styles.headerTitle}>
                        <Link href="/">{process.env.NAME}</Link>
                    </h1>
                    <Link
                        href="/api/next-blog/dashboard"
                        className={styles.dashboardLink}
                        prefetch={false}
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </header>

            <main className={styles.main}>
                {/* Hero */}
                <section className={styles.hero}>
                    <h2 className={styles.mainTitle}>Good to have you here 👋</h2>
                    <p className={styles.mainSubtitle}>
                        Thoughts, stories, and ideas — fresh from the desk.
                        Pull up a chair and stay a while.
                    </p>
                </section>

                {posts.length > 0 ? (
                    /* Latest Posts */
                    <section className={styles.postsSection}>
                        <h3 className={styles.sectionTitle}>Latest from the blog</h3>
                        <div className={styles.postGrid}>
                            {posts.map((post) => (
                                <Link href={`/blogs/${post.slug}`} key={post._id}
                                      style={{textDecoration: 'none', color: 'inherit'}}>
                                    <div className={styles.postCard}>
                                        <div className={styles.postCardContent}>
                                            <h3 className={styles.postCardTitle}>{post.title}</h3>
                                            <p className={styles.postCardExcerpt}>{post.excerpt}</p>
                                        </div>
                                        <div className={styles.postCardFooter}>
                                            <span className={styles.postCardLink}>Read more &rarr;</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Writing Tips */}
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>A few things worth remembering</h3>
                            <div className={styles.tipsGrid}>
                                {writingTips.map((tip) => (
                                    <div key={tip.title} className={styles.tipCard}>
                                        <span className={styles.tipEmoji}>{tip.emoji}</span>
                                        <h4 className={styles.tipTitle}>{tip.title}</h4>
                                        <p className={styles.tipBody}>{tip.body}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Further Reading */}
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Want to write better? Start here.</h3>
                            <div className={styles.linksGrid}>
                                {readingLinks.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.linkCard}
                                    >
                                        <span className={styles.linkLabel}>{link.label} →</span>
                                        <p className={styles.linkDesc}>{link.desc}</p>
                                    </a>
                                ))}
                            </div>
                        </section>
                    </>
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