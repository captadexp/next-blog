import {TagList} from '@supergrowthai/next-blog-ui';
import {getTestTags} from '../../test-data';

export default async function TagListTestPage() {
    const tags = await getTestTags();

    if (!tags || tags.length === 0) {
        return <div>No tags found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>TagList Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Grid Layout (Default)</h2>
                <TagList tags={tags}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>List Layout</h2>
                <TagList tags={tags} layout="list"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Inline Layout</h2>
                <TagList tags={tags} layout="inline"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Grid with 2 Columns</h2>
                <TagList tags={tags} columns={2}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Grid with 4 Columns</h2>
                <TagList tags={tags} columns={4}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Styles</h2>
                <TagList
                    tags={tags.slice(0, 5)}
                    layout="inline"
                    itemStyle={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: 'bold'
                    }}
                    linkStyle={{
                        color: '#1e40af'
                    }}
                />
            </div>
        </div>
    );
}