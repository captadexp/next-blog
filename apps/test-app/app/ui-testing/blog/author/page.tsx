import {BlogAuthor} from '@supergrowthai/next-blog-ui';
import {getTestBlog} from '../../test-data';

export default async function BlogAuthorTestPage() {
    const blog = await getTestBlog();

    if (!blog) {
        return <div>No blog found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>BlogAuthor Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Default (With Avatar)</h2>
                <BlogAuthor blog={blog}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Avatar</h2>
                <BlogAuthor blog={blog} showAvatar={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>With Bio</h2>
                <BlogAuthor blog={blog} showBio={true}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Link</h2>
                <BlogAuthor blog={blog} linkToAuthor={false}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Large Avatar</h2>
                <BlogAuthor
                    blog={blog}
                    avatarStyle={{
                        width: '60px',
                        height: '60px',
                        fontSize: '24px'
                    }}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Colors</h2>
                <BlogAuthor
                    blog={blog}
                    showBio={true}
                    avatarStyle={{
                        backgroundColor: '#fbbf24',
                        color: '#78350f'
                    }}
                    nameStyle={{
                        color: '#dc2626',
                        fontSize: '18px'
                    }}
                    bioStyle={{
                        color: '#4b5563',
                        fontStyle: 'italic'
                    }}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Multiple Authors Display</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <BlogAuthor blog={blog} showBio={true}/>
                    <BlogAuthor blog={blog} showBio={true}/>
                    <BlogAuthor blog={blog} showBio={true}/>
                </div>
            </div>
        </div>
    );
}