import path from "path";
import fs from "fs";
import {adapters} from "@supergrowthai/next-blog";
import {notFound} from "next/navigation";
import {Header, RecentPosts, RelatedPosts, Content, AuthorInfo} from "@supergrowthai/next-blog-ui";
//
const dataPath = path.join(process.cwd(), "blog-data");

// Ensure the data directory exists
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {recursive: true});
}

// Initialize the FileDBAdapter
const dbProvider = async () => new adapters.FileDBAdapter(`${dataPath}/`);

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.generated.getDetailedBlogObject({slug});

    if (blog?.status !== "published")
        return notFound();

    return <>
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Header db={blogDb} blog={blog}/>

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content */}
                <section className="lg:col-span-2 space-y-8">
                    <Content db={blogDb} blog={blog}/>
                    <AuthorInfo db={blogDb} blog={blog}/>
                </section>

                {/* Sidebar */}
                <aside className="lg:col-span-1 space-y-8">
                    <RelatedPosts db={blogDb} blog={blog}/>
                    <RecentPosts db={blogDb} blog={blog}/>
                </aside>
            </main>

            <footer className="bg-white py-6 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} Next-Blog. All rights reserved.
            </footer>
        </div>
    </>
}