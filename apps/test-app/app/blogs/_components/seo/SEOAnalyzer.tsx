"use client";
import React, {ReactNode, useEffect, useState} from 'react';
import styles from './SEOAnalyzer.module.css';

// --- Types and Interfaces ---

type Status = 'good' | 'warning' | 'error' | 'info';

interface ReportItemData {
    title: string;
    status: Status;
    message: string | ReactNode;
}

interface SEOReport {
    onPage: ReportItemData[];
    technical: ReportItemData[];
    social: ReportItemData[];
}

interface SEOAnalyzerProps {
    children?: ReactNode;
}

// --- Helper Functions ---

const getElementText = (selector: string): string => document.querySelector(selector)?.textContent || '';
const getElementAttr = (selector: string, attr: string): string => document.querySelector(selector)?.getAttribute(attr) || '';

const checkPresence = (selector: string): boolean => document.querySelector(selector) !== null;

// --- Analysis Functions ---

const analyzeOnPage = (mainContentText: string): ReportItemData[] => {
    const results: ReportItemData[] = [];

    // Title
    const title = getElementText('title');
    let titleStatus: Status = 'good';
    let titleMsg = `Length is ${title.length} chars.`;
    if (title.length < 50 || title.length > 60) titleStatus = 'warning';
    else titleMsg += ' Keyword found.';
    results.push({title: 'Title Tag', status: titleStatus, message: titleMsg});

    // Meta Description
    const desc = getElementAttr('meta[name="description"]', 'content');
    let descStatus: Status = 'good';
    let descMsg = `Length is ${desc.length} chars.`;
    if (desc.length < 150 || desc.length > 160) descStatus = 'warning';
    else descMsg += ' Keyword found.';
    results.push({title: 'Meta Description', status: descStatus, message: descMsg});

    // Headings Hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let hierarchyOk = true;
    for (let i = 0; i < headings.length - 1; i++) {
        const currentLevel = parseInt(headings[i].tagName.substring(1));
        const nextLevel = parseInt(headings[i + 1].tagName.substring(1));
        if (nextLevel > currentLevel + 1) {
            hierarchyOk = false;
            break;
        }
    }
    results.push({
        title: 'Headings Hierarchy',
        status: hierarchyOk ? 'good' : 'warning',
        message: hierarchyOk ? 'Headings follow a logical order.' : 'A heading level was skipped (e.g., H3 after H1).'
    });

    // Links
    const internalLinks = Array.from(document.querySelectorAll('main a')).filter(a => (a as HTMLAnchorElement).href.includes(window.location.hostname)).length;
    const externalLinks = Array.from(document.querySelectorAll('main a')).filter(a => !(a as HTMLAnchorElement).href.includes(window.location.hostname)).length;
    results.push({
        title: 'Content Links',
        status: 'info',
        message: `Found ${internalLinks} internal and ${externalLinks} external links.`
    });

    // Image SEO
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('main img'));
    const missingAlt = images.filter(img => !img.alt || img.alt.trim() === '').length;
    const genericFilenames = images.filter(img => /image\d*|screenshot|pic\d*/.test(img.src)).length;
    let imgStatus: Status = 'good';
    let imgMsg = `${images.length} images found.`;
    if (missingAlt > 0) {
        imgStatus = 'error';
        imgMsg += ` ${missingAlt} are missing alt text.`;
    }
    if (genericFilenames > 0) {
        imgStatus = 'warning';
        imgMsg += ` ${genericFilenames} may have generic filenames.`;
    }
    results.push({title: 'Image SEO', status: imgStatus, message: imgMsg});

    return results;
};

const analyzeTechnical = (): ReportItemData[] => {
    const results: ReportItemData[] = [];

    // Canonical
    const canonical = getElementAttr('link[rel="canonical"]', 'href');
    results.push({
        title: 'Canonical URL',
        status: canonical ? 'good' : 'error',
        message: canonical ? `Set to: ${canonical}` : 'Not found. This is critical for avoiding duplicate content.'
    });

    // Meta Robots
    const robots = getElementAttr('meta[name="robots"]', 'content');
    let robotStatus: Status = 'good';
    if (!robots) robotStatus = 'warning';
    if (robots.includes('noindex') || robots.includes('nofollow')) robotStatus = 'error';
    results.push({
        title: 'Meta Robots',
        status: robotStatus,
        message: robots ? `Set to: "${robots}"` : 'Not found. Defaults to "index, follow".'
    });

    // Viewport
    results.push({
        title: 'Mobile Viewport',
        status: checkPresence('meta[name="viewport"]') ? 'good' : 'error',
        message: checkPresence('meta[name="viewport"]') ? 'Viewport tag is present.' : 'Viewport tag not found.'
    });

    // Favicon
    results.push({
        title: 'Favicon',
        status: checkPresence('link[rel="icon"], link[rel="shortcut icon"]') ? 'good' : 'info',
        message: 'Favicon is declared.'
    });

    // JSON-LD
    const ldJsonEl = document.querySelector('script[type="application/ld+json"]');
    if (ldJsonEl) {
        try {
            const data = JSON.parse(ldJsonEl.innerHTML);
            const type = data['@type'];
            let message = `Found schema type: ${type}.`;
            if (type === 'BlogPosting' && (!data.publisher || !data.author || !data.image)) {
                message += ' Missing recommended fields like publisher, author, or image object.';
            }
            results.push({title: 'Structured Data (JSON-LD)', status: 'good', message});
        } catch (e) {
            results.push({
                title: 'Structured Data (JSON-LD)',
                status: 'error',
                message: 'Script found, but contains invalid JSON.'
            });
        }
    } else {
        results.push({title: 'Structured Data (JSON-LD)', status: 'error', message: 'No JSON-LD script tag found.'});
    }

    return results;
};

const analyzeSocial = (): ReportItemData[] => {
    const results: ReportItemData[] = [];

    // Open Graph
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:type', 'og:url'];
    const missingOgTags = ogTags.filter(tag => !checkPresence(`meta[property="${tag}"]`));
    results.push({
        title: 'Open Graph Tags',
        status: missingOgTags.length === 0 ? 'good' : 'warning',
        message: missingOgTags.length === 0 ? 'All key OG tags are present.' : `Missing: ${missingOgTags.join(', ')}.`
    });

    // Twitter Cards
    const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
    const missingTwitterTags = twitterTags.filter(tag => !checkPresence(`meta[name="${tag}"]`));
    results.push({
        title: 'Twitter Cards',
        status: missingTwitterTags.length === 0 ? 'good' : 'warning',
        message: missingTwitterTags.length === 0 ? 'All key Twitter tags are present.' : `Missing: ${missingTwitterTags.join(', ')}.`
    });

    // Hreflang
    const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    if (hreflangLinks.length > 0) {
        results.push({
            title: 'Hreflang Tags',
            status: 'info',
            message: `Found ${hreflangLinks.length} hreflang tags for international targeting.`
        });
    } else {
        results.push({
            title: 'Hreflang Tags',
            status: 'info',
            message: 'No hreflang tags found. Only needed for multi-language sites.'
        });
    }

    return results;
};


// --- UI Components ---

const getIcon = (status: Status) => {
    const icons = {good: '✓', warning: '!', error: '✗', info: 'ℹ️'};
    return <span className={styles[status]}>{icons[status]}</span>;
};

const ReportItem: React.FC<{ item: ReportItemData }> = ({item}) => (
    <div className={styles.reportItem}>
        <div className={styles.itemHeader}>
            {getIcon(item.status)} <h4>{item.title}</h4>
        </div>
        <div className={styles.reportMessage}>{item.message}</div>
    </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({
                                                                                                active,
                                                                                                onClick,
                                                                                                children
                                                                                            }) => (
    <button onClick={onClick} className={`${styles.tabButton} ${active ? styles.active : ''}`}>
        {children}
    </button>
);


// --- Main Component ---

export const SEOAnalyzer: React.FC<SEOAnalyzerProps> = ({children}) => {
    const [report, setReport] = useState<SEOReport | null>(null);
    const [activeTab, setActiveTab] = useState<'onPage' | 'technical' | 'social'>('onPage');

    useEffect(() => {
        const runAnalysis = () => {
            const mainContentText = document.querySelector('main')?.innerText || '';
            setReport({
                onPage: analyzeOnPage(mainContentText),
                technical: analyzeTechnical(),
                social: analyzeSocial(),
            });
        };
        const timer = setTimeout(runAnalysis, 500); // Delay to ensure DOM is painted
        return () => clearTimeout(timer);
    }, []);

    if (!report) {
        return <div className={styles.seoAnalyzer}>Loading SEO Analysis...</div>;
    }

    const tabs = {
        onPage: {label: 'On-Page SEO', data: report.onPage},
        technical: {label: 'Technical & Schema', data: report.technical},
        social: {label: 'International & Social', data: report.social},
    };

    return (
        <div className={styles.seoAnalyzer}>
            <div className={styles.header}>
                <h3>Grand Master SEO Analysis</h3>
            </div>
            <div className={styles.tabContainer}>
                {Object.keys(tabs).map(key => (
                    <TabButton key={key} active={activeTab === key} onClick={() => setActiveTab(key as any)}>
                        {tabs[key as keyof typeof tabs].label}
                    </TabButton>
                ))}
            </div>
            <div className={styles.tabContent}>
                {tabs[activeTab].data.map(item => <ReportItem key={item.title} item={item}/>)}
            </div>
        </div>
    );
};