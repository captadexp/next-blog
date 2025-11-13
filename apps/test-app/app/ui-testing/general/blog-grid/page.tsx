import {BlogGrid} from '@supergrowthai/next-blog-ui';
import {getTestBlogs} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function BlogGridTestPage() {
    const blogs = await getTestBlogs(9);

    if (!blogs || blogs.length === 0) {
        return <div>No blogs found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogGrid Component Test</h1>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>3 Columns Grid (Default)</h2>
                <BlogGrid blogs={blogs.slice(0, 6)}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>2 Columns Grid</h2>
                <BlogGrid blogs={blogs.slice(0, 4)} columns={{sm: 1, md: 2, lg: 2}}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>4 Columns Grid</h2>
                <BlogGrid blogs={blogs.slice(0, 8)} columns={{sm: 2, md: 3, lg: 4}}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Images</h2>
                <BlogGrid blogs={blogs.slice(0, 3)} showImage={false}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Excerpts</h2>
                <BlogGrid blogs={blogs.slice(0, 3)} showExcerpt={false}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>Minimal (Title Only)</h2>
                <BlogGrid
                    blogs={blogs.slice(0, 3)}
                    showImage={false}
                    showExcerpt={false}
                    showAuthor={false}
                    showDate={false}
                    showCategory={false}
                    showReadMore={false}
                />
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>With Tags</h2>
                <BlogGrid blogs={blogs.slice(0, 3)} showTags={true}/>
            </div>

            <div style={{marginBottom: '60px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Gap</h2>
                <BlogGrid blogs={blogs.slice(0, 3)} gap={40}/>
            </div>
        </div>
    );
}