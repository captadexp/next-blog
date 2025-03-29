import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import BasePage from "../../../components/utils/BasePage";

export default function CreateCategory() {
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text'},
        {key: 'slug', label: 'Slug', type: 'text'},
        {key: 'description', label: 'Description', type: 'textarea'},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/next-blog/dashboard/categories"} submitLabel={"Create"} id={"createCategory"}
                         postTo={"/api/next-blog/api/categories/create"} fields={fields}/>
        </BasePage>
    );
}
