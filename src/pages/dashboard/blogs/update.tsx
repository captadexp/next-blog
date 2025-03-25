import {CNextRequest} from "../../../types";
import NotFound from "../../../components/NotFound";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";

export default async function updateBlog(request: CNextRequest) {
    const id = request._params.id;
    const db = await request.db();
    const blog = await db.blogs.findById(id);
    if (!blog) return <NotFound/>;

    const fields: DynamicFormFieldType[] = [
        {key: "id", label: "ID", type: "text", value: blog._id, disabled: true},
        {key: "title", label: "Title", type: "text", value: blog.title},
        {key: "slug", label: "Slug", type: "text", value: blog.slug},
        {key: "content", label: "Content", type: "richtext", value: blog.content},
        {key: "category", label: "Category", type: "text", value: blog.category},
        {key: "tags", label: "Tags (comma-separated)", type: "autocomplete", value: Array.isArray(blog.tags) ? blog.tags.join(", ") : "" },
    ];

    return (
        <DynamicForm
            redirectTo={"/api/next-blog/dashboard/blogs"}
            submitLabel={"Update"}
            id={"updateBlog"}
            postTo={`/api/next-blog/api/blog/${id}/update`}
            fields={fields}
        />
    );
}
