import React from "react";
import {CNextRequest} from "../../../database";
import BasePage from "../../../components/utils/BasePage";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async (request: CNextRequest) => {
    const db = await request.db()
    const items = await db.authors.find({})

    return <ItemLandingPage items={items.map(item => ({...item, title: item.name}))}
                            itemLinkBasePath={"/api/sgai-blog/dashboard/authors/"}
                            createUrl={"/api/sgai-blog/dashboard/authors/create"}
                            createBtnText={"Create Author"}/>
}
