import NotFound from "../../../components/NotFound";
import React from "react";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import BasePage from "../../../components/utils/BasePage";

export default function CreateCategory() {
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text'},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/tags"} submitLabel={"Create"} id={"createTag"} postTo={"/api/sgai-blog/api/tags/create"}
                         fields={fields}/>
        </BasePage>
    );
}
