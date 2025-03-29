import {CNextRequest} from "../../../types";
import BasePage from "../../../components/utils/BasePage";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async (request: CNextRequest) => {
    const db = await request.db()
    const items = await db.tags.find({})
    return <ItemLandingPage items={items.map(item => ({...item, title: item.name}))}
                            itemLinkBasePath={"/api/next-blog/dashboard/tags/"}
                            createUrl={"/api/next-blog/dashboard/tags/create"}
                            createBtnText={"Create Tag"}/>
}
