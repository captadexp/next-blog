import {CNextRequest} from "../../../index";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import BasePage from "../../../components/utils/BasePage";
import NotFound from "../../../components/NotFound";
import React from "react";


export default async function updateAuthor(request: CNextRequest) {
    const id = request._params.id
    const db = await request.db()
    const author = await db.authors.findById(id);
    if (!author)
        return <NotFound/>;

    const fields: DynamicFormFieldType[] = [
        {key: "id", label: "id", type: "text", value: author._id, disabled: true},
        {key: 'name', label: 'Name', type: 'text', value: author.name},
        {key: 'email', label: 'Email', type: 'text', value: author.email},
        {key: 'bio', label: 'Bio', type: 'textarea', value: author.bio},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/authors"} submitLabel={"Update"} id={"createAuthor"} postTo={`/api/sgai-blog/api/author/${id}/update`}
                         fields={fields}/>
        </BasePage>
    );
}
