import path from "path";
import fs from "fs";
import {FileDBAdapter} from "@supergrowthai/next-blog";
import {notFound} from "next/navigation";

const dataPath = path.join(process.cwd(), "blog-data");

// Ensure the data directory exists
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {recursive: true});
}

// Initialize the FileDBAdapter
const dbProvider = async () => new FileDBAdapter(`${dataPath}/`);

export default async function (props: { params: Promise<{ slug: string }> }) {
    const {params} = props;
    const {slug} = await params;
    const blogDb = await dbProvider();
    const blog = await blogDb.blogs.findOne({slug});

    if (blog?.status !== "published")
        return notFound();

    return <>
        <div dangerouslySetInnerHTML={{__html: blog.content}}></div>
    </>
}