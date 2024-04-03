import {CNextRequest} from "../../../index";
import React from "react";
import DynamicForm, {DynamicFormFieldType} from "../../../components/utils/DynamicForm";
import NotFound from "../../../components/NotFound";
import BasePage from "../../../components/utils/BasePage";

export default async function updateTag(request: CNextRequest) {
    const id = request._params.id;
    const db = await request.db();
    const tag = await db.tags.findById(id);
    if (!tag) return <NotFound/>;

    const fields: DynamicFormFieldType[] = [
        {key: "id", label: "ID", type: "text", value: tag._id, disabled: true},
        {key: 'name', label: 'Name', type: 'text', value: tag.name},
        {key: 'slug', label: 'Slug', type: 'text', value: tag.slug},
    ];

    return (
        <BasePage>
            <DynamicForm redirectTo={"/api/sgai-blog/dashboard/tags"} submitLabel={"Update"} id={"updateTag"}
                         postTo={`/api/sgai-blog/api/tag/${id}/update`}
                         fields={fields}/>
        </BasePage>
    );
}

