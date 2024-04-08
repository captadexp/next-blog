import BasePage from "../../../components/utils/BasePage";
import {CNextRequest} from "../../../types";
import ItemLandingPage from "../../../components/dashboard/ItemLandingPage";

export default async function BlogsLanding(request: CNextRequest) {
    const db = await request.db()
    const items = await db.blogs.find({})

    return <ItemLandingPage items={items}
                            itemLinkBasePath={"/api/next-blog/dashboard/blogs/"}
                            createUrl={"/api/next-blog/dashboard/blogs/create"}
                            createBtnText={"Create Blog"}/>

}



