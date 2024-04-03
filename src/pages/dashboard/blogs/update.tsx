import {CNextRequest} from "../../../index";
import React from "react";
import BasePage from "../../../components/utils/BasePage";
import NotFound from "../../../components/NotFound";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";

export default async function updateBlog(request: CNextRequest) {
    const id = request._params.id;
    const db = await request.db();
    const blog = await db.blogs.findById(id);
    if (!blog) return <NotFound/>;

    const fields: DynamicFormFieldType[] = [
        {key: "id", label: "ID", type: "text", value: blog._id, disabled: true},
        {key: 'title', label: 'Title', type: 'text', value: blog.title},
        {key: 'slug', label: 'Slug', type: 'text', value: blog.slug},
        {key: 'content', label: 'Content', type: 'richtext', value: blog.content},
        {key: 'category', label: 'Category', type: 'text', value: blog.category},
        {key: 'tags', label: 'Tags (comma-separated)', type: 'text', value: blog.tags.join(', ')},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/blogs"} submitLabel={"Update"} id={"updateBlog"}
                         postTo={`/api/sgai-blog/api/blog/${id}/update`}
                         fields={fields}/>
        </BasePage>
    );
}

