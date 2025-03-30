import BasePage from "../utils/BasePage";

export default function ItemLandingPage<T extends { _id: string, title: string }>(props: {
    createUrl: string,
    createBtnText: string,
    items: T[],
    itemLinkBasePath: string
}) {
    const {
        itemLinkBasePath,
        createUrl,
        createBtnText,
        items
    } = props;

    return <BasePage>
        <div className="p-5 max-w-2xl mx-auto">
            <a href={createUrl} className="inline-block mb-5 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded no-underline">
                {createBtnText}
            </a>
            <br/>
            <ul className="list-none p-0 m-0 bg-white rounded shadow-sm">
                {items.map((item, index) => (
                    <li key={index} className="border-b border-gray-100 p-3 hover:bg-gray-50">
                        <a href={`${itemLinkBasePath}${item._id}`}
                           className="no-underline text-blue-500 hover:text-blue-700 text-base">
                            {item.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    </BasePage>
}
