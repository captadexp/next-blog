import {CNextRequest} from "../../../types";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import NotFound from "../../../components/NotFound";
import BasePage from "../../../components/utils/BasePage";

export default async function updateCategory(request: CNextRequest) {
    const id = request._params.id;
    const db = await request.db();
    const category = await db.categories.findById(id);
    if (!category) return <NotFound/>;

    const fields: DynamicFormFieldType[] = [
        {key: "id", label: "ID", type: "text", value: category._id, disabled: true},
        {key: 'name', label: 'Name', type: 'text', value: category.name},
        {key: 'slug', label: 'Slug', type: 'text', value: category.slug},
        {key: 'description', label: 'Description', type: 'textarea', value: category.description},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/next-blog/dashboard/categories"} submitLabel={"Update"} id={"updateCategory"} postTo={`/api/next-blog/api/category/${id}/update`} fields={fields}/>
        </BasePage>
    );
}

