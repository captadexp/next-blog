export default function ItemLandingPage<T extends { _id: string; title: string }>(props: {
    createUrl: string;
    createBtnText: string;
    items: T[];
    itemLinkBasePath: string;
}) {
    const {itemLinkBasePath, createUrl, createBtnText, items} = props;

    return (
        <div className="p-5 max-w-lg mx-auto">
            <a
                href={createUrl}
                className="inline-block mb-5 bg-blue-500 text-white px-4 py-2 rounded-md text-center hover:bg-blue-600"
            >
                {createBtnText}
            </a>
            <ul className="list-none p-0 m-0">
                {items.map((item) => (
                    <li key={item._id} className="border-b border-gray-200 p-3">
                        <a href={`${itemLinkBasePath}${item._id}`}
                           className="text-blue-500 text-lg hover:underline">
                            {item.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
