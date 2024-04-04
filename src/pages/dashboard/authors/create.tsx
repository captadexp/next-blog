import BasePage from "../../../components/utils/BasePage";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";

export default function CreateAuthor() {
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text'},
        {key: 'username', label: 'Username', type: 'text'},
        {key: 'slug', label: 'Slug', type: 'text'},
        {key: 'email', label: 'Email', type: 'text'},
        {key: 'password', label: 'Password', type: 'text'},
        {key: 'bio', label: 'Bio', type: 'textarea'},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/authors"} submitLabel={"Create"} id={"createAuthor"}
                         postTo={"/api/sgai-blog/api/authors/create"} fields={fields}/>
        </BasePage>
    );
}
