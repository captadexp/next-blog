import {CNextRequest} from "../../../types";
import BasePage from "../../../components/utils/BasePage";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";


export default function createBlog(request: CNextRequest) {

    const fields: DynamicFormFieldType[] = [
        {key: 'title', label: 'Title', type: 'text'},
        {key: 'slug', label: 'Slug', type: 'text'},
        {key: 'content', label: 'Content', type: 'richtext'},
        {key: 'category', label: 'Category', type: 'text'},
        {key: 'tags', label: 'Tags (comma-separated)', type: 'text'}
    ];

    return <BasePage>
        <DynamicForm redirectTo={"/api/sgai-blog/dashboard/blogs"} id={"createBlog"}
                     postTo={"/api/sgai-blog/api/blogs/create"} fields={fields} submitLabel={"Create"}/>
    </BasePage>
}
