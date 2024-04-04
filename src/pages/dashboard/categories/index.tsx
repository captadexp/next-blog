import {CNextRequest} from "../../../types";
import BasePage from "../../../components/utils/BasePage";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async (request: CNextRequest) => {
    const db = await request.db()
    const items = await db.categories.find({})
    return <ItemLandingPage items={items.map(item => ({...item, title: item.name}))}
                            itemLinkBasePath={"/api/sgai-blog/dashboard/categories/"}
                            createUrl={"/api/sgai-blog/dashboard/categories/create"}
                            createBtnText={"Create Category"}/>
}
