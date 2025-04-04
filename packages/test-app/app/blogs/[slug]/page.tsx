import { notFound } from 'next/navigation'
import FileDBAdapter from '../../../../../packages/core/src/adapters/FileDBAdapter'
import path from 'path'

const db = new FileDBAdapter(path.join(process.cwd(), 'blog-data/'))

export default async function BlogPage({ params }: { params: { slug: string } }) {
    try {
        const blog = await db.blogs.findOne({ slug: params.slug })
        if (!blog) return notFound()

        const formattedDate = new Date(blog.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        return (
            <div>
                {/* Blog Title - Centered */}
                <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
                    {blog.title}
                </h1>

                {/* Creation Date - Centered below title */}
                <div>
                    {formattedDate}
                </div>

                {/* Blog Content - Centered with proper spacing */}
                <div
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />
            </div>
        )
    } catch (error) {
        return notFound()
    }
}
