import {AuthorList} from '@supergrowthai/next-blog-ui';
import {getTestAuthors} from '../../test-data';
import {dbProvider} from '@/lib/db';
import "@supergrowthai/next-blog-ui/style.css";

export default async function AuthorListTestPage() {
    const authors = await getTestAuthors();
    const db = await dbProvider();

    // Add post counts to authors
    const authorsWithCount = await Promise.all(
        authors.map(async (author) => {
            const blogs = await db.blogs.find({userId: author._id});
            return {
                ...author,
                postCount: blogs.length
            };
        })
    );

    if (!authorsWithCount || authorsWithCount.length === 0) {
        return <div>No authors found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>AuthorList Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Grid Layout (Default)</h2>
                <AuthorList authors={authorsWithCount}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>List Layout</h2>
                <AuthorList authors={authorsWithCount} layout="list"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>2 Columns Grid</h2>
                <AuthorList authors={authorsWithCount} columns={2}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>4 Columns Grid</h2>
                <AuthorList authors={authorsWithCount} columns={4}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Bio</h2>
                <AuthorList authors={authorsWithCount} showBio={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Post Count</h2>
                <AuthorList authors={authorsWithCount} showPostCount={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Styles</h2>
                <AuthorList
                    authors={authorsWithCount.slice(0, 3)}
                    itemStyle={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24'
                    }}
                    avatarStyle={{
                        backgroundColor: '#f59e0b'
                    }}
                    nameStyle={{
                        color: '#78350f'
                    }}
                />
            </div>
        </div>
    );
}