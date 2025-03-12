import {CNextRequest} from "../../../types";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";


export default function createBlog(request: CNextRequest) {

    const fields: DynamicFormFieldType[] = [
        {key: 'title', label: 'Title', type: 'text'},
        {key: 'slug', label: 'Slug', type: 'text'},
        {key: 'content', label: 'Content', type: 'richtext'},
        {key: 'category', label: 'Category', type: 'text'},
        {key: 'tags', label: 'Tags (comma-separated)', type: 'autocomplete'}
    ];

    return <DynamicForm redirectTo={"/api/next-blog/dashboard/blogs"} id={"createBlog"}
                        postTo={"/api/next-blog/api/blogs/create"} fields={fields} submitLabel={"Create"}/>
}
