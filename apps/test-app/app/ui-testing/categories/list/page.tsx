import {CategoryList} from '@supergrowthai/next-blog-ui';
import {getTestCategories} from '../../test-data';
import "@supergrowthai/next-blog-ui/style.css";

export default async function CategoryListTestPage() {
    const categories = await getTestCategories();

    if (!categories || categories.length === 0) {
        return <div>No categories found for testing</div>;
    }

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>CategoryList Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Grid Layout (Default)</h2>
                <CategoryList categories={categories}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>List Layout</h2>
                <CategoryList categories={categories} layout="list"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Cards Layout</h2>
                <CategoryList categories={categories} layout="cards"/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>2 Columns Grid</h2>
                <CategoryList categories={categories} columns={{sm: 1, md: 2}}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>4 Columns Cards</h2>
                <CategoryList categories={categories} layout="cards" columns={{sm: 2, md: 4}}/>
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Styles</h2>
                <CategoryList
                    categories={categories.slice(0, 3)}
                    layout="cards"
                    itemStyle={{
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #0ea5e9'
                    }}
                    nameStyle={{
                        color: '#0284c7'
                    }}
                />
            </div>
        </div>
    );
}