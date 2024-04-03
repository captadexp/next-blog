import React from "react";
import {CNextRequest} from "../../../index";
import BasePage from "../../../components/utils/BasePage";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async (request: CNextRequest) => {
    const db = await request.db()
    const items = await db.tags.find({})
    return <ItemLandingPage items={items.map(item => ({...item, title: item.name}))}
                            itemLinkBasePath={"/api/sgai-blog/dashboard/tags/"}
                            createUrl={"/api/sgai-blog/dashboard/tags/create"}
                            createBtnText={"Create Tag"}/>
}
