import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import BasePage from "../../../components/utils/BasePage";

export default function CreateCategory() {
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text'},
        {key: 'slug', label: 'Slug', type: 'text'},
    ];

    return (
        <DynamicForm redirectTo={"/api/next-blog/dashboard/tags"} submitLabel={"Create"} id={"createTag"}
                     postTo={"/api/next-blog/api/tags/create"}
                     fields={fields}/>
    );
}
