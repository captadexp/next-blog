import BasePage from "../../../components/utils/BasePage";
import React from "react";
import {CNextRequest} from "../../../database";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async function (request: CNextRequest) {
    const db = await request.db()
    const items = await db.blogs.find({})

    return <ItemLandingPage items={items}
                            itemLinkBasePath={"/api/sgai-blog/dashboard/blogs/"}
                            createUrl={"/api/sgai-blog/dashboard/blogs/create"}
                            createBtnText={"Create Blog"}/>

}



