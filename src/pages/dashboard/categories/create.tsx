import NotFound from "../../../components/NotFound";
import React from "react";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import BasePage from "../../../components/utils/BasePage";

export default function CreateCategory() {
    const fields: DynamicFormFieldType[] = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/categories"} submitLabel={"Create"} id={"createCategory"} postTo={"/api/sgai-blog/api/categories/create"} fields={fields} />
        </BasePage>
    );
}
