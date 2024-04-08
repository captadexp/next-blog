import {render as preactRender} from "preact";
import {createContext, useState, useContext, useEffect} from "preact/compat";
import DynamicForm, {DynamicFormFieldType} from "./Forms";


export default function renderDashboard(container: any) {
    return preactRender(<BasePage/>, container)
}

const DashboardContext = createContext({page: "dashboard", setPage: console.log})
const useDashboard = () => useContext(DashboardContext)

function BasePage() {
    const [page, setPage] = useState("dashboard")

    return <DashboardContext.Provider value={{page, setPage}}>
        <div className="centered-container">
            <div className="elevated-content">
                {page.split("/").map(part => <span><a key={part} href={""}>{part}</a>&nbsp;{">"}&nbsp;</span>)}
                <RenderPage/>
            </div>
        </div>
        <style dangerouslySetInnerHTML={{
            __html: `
     /* Basic reset for body margin and padding */
        body, html {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
    }

        /* Flex container to center content */
        .centered-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        background-color: #f0f0f0; /* Light grey background */
    }

        /* Elevated effect for child content */
        .elevated-content {
        max-width: 90dvw;
        max-height: 90dvh;
        overflow: scroll;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Simple shadow for depth */
        background-color: #ffffff; /* White background */
        padding: 20px; /* Spacing around the content */
        border-radius: 8px; /* Optional: rounded corners */
    }
    `
        }}>
        </style>
    </DashboardContext.Provider>
}

function RenderPage() {
    const dashboard = useDashboard()
    if (dashboard.page === "dashboard")
        return <Dashboard/>

    if (dashboard.page === "dashboard/blogs")
        return <CommonLanding title={"Blogs"} createUrl={"blog/create"} updateUrlBase={"dashboard/blog/update"}
                              ep={"/api/next-blog/api/blogs"}/>
    if (dashboard.page === "dashboard/blog/create") {
        const fields: DynamicFormFieldType[] = [
            {key: 'title', label: 'Title', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'content', label: 'Content', type: 'richtext'},
            {key: 'category', label: 'Category', type: 'text'},
            {key: 'tags', label: 'Tags (comma-separated)', type: 'text'}
        ];
        return <CommonCreate fields={fields} postTo={`/api/next-blog/api/blog/update`}
                             redirectTo={"/api/next-blog/dashboard/blogs"}/>
    }
    if (dashboard.page.startsWith("dashboard/blog/update")) {
        const id = dashboard.page.substring("dashboard/blog/update/".length);
        const fields: DynamicFormFieldType[] = [
            {key: 'title', label: 'Title', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'content', label: 'Content', type: 'richtext'},
            {key: 'category', label: 'Category', type: 'text'},
            {key: 'tags', label: 'Tags (comma-separated)', type: 'text'}
        ];
        return <CommonUpdate fields={fields} dataFrom={`/api/next-blog/api/blog/${id}`} id={id}
                             postTo={`/api/next-blog/api/blog/update`}
                             redirectTo={"/api/next-blog/dashboard/blogs"}/>
    }

    if (dashboard.page === "dashboard/tags")
        return <CommonLanding title={"Tags"} createUrl={"tag/create"} updateUrlBase={"dashboard/tag/update"}
                              ep={"/api/next-blog/api/tags"}/>
    if (dashboard.page === "dashboard/tag/create") {
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
        ];
        return <CommonCreate fields={fields} postTo={`/api/next-blog/api/tag/update`}
                             redirectTo={"/api/next-blog/dashboard/tags"}/>
    }
    if (dashboard.page.startsWith("dashboard/tag/update")) {
        const id = dashboard.page.substring("dashboard/tag/update/".length);
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
        ];
        return <CommonUpdate fields={fields} dataFrom={`/api/next-blog/api/tag/${id}`} id={id}
                             postTo={`/api/next-blog/api/tag/update`}
                             redirectTo={"/api/next-blog/dashboard/tags"}/>
    }

    if (dashboard.page === "dashboard/categories")
        return <CommonLanding title={"Categories"} createUrl={"category/create"} updateUrlBase={"dashboard/category/update"}
                              ep={"/api/next-blog/api/categories"}/>
    if (dashboard.page === "dashboard/category/create") {
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'description', label: 'Description', type: 'textarea'},
        ];
        return <CommonCreate fields={fields} postTo={`/api/next-blog/api/category/create`}
                             redirectTo={"/api/next-blog/dashboard/categories"}/>
    }
    if (dashboard.page.startsWith("dashboard/category/update")) {
        const id = dashboard.page.substring("dashboard/category/update/".length);
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'description', label: 'Description', type: 'textarea'},
        ];
        return <CommonUpdate fields={fields} dataFrom={`/api/next-blog/api/category/${id}`} id={id}
                             postTo={`/api/next-blog/api/category/update`}
                             redirectTo={"/api/next-blog/dashboard/categories"}/>
    }

    if (dashboard.page === "dashboard/authors")
        return <CommonLanding title={"Authors"} createUrl={"author/create"} updateUrlBase={"dashboard/author/update"}
                              ep={"/api/next-blog/api/authors"}/>
    if (dashboard.page === "dashboard/author/create") {
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'username', label: 'Username', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'email', label: 'Email', type: 'text'},
            {key: 'bio', label: 'Bio', type: 'textarea'},
        ];
        return <CommonCreate fields={fields} postTo={`/api/next-blog/api/author/create`}
                             redirectTo={"/api/next-blog/dashboard/authors"}/>
    }
    if (dashboard.page.startsWith("dashboard/author/update")) {
        const id = dashboard.page.substring("dashboard/author/update/".length);
        const fields: DynamicFormFieldType[] = [
            {key: 'name', label: 'Name', type: 'text'},
            {key: 'username', label: 'Username', type: 'text'},
            {key: 'slug', label: 'Slug', type: 'text'},
            {key: 'email', label: 'Email', type: 'text'},
            {key: 'password', label: 'Password', type: 'text'},
            {key: 'bio', label: 'Bio', type: 'textarea'},
        ];
        return <CommonUpdate fields={fields} dataFrom={`/api/next-blog/api/author/${id}`} id={id}
                             postTo={`/api/next-blog/api/author/update`}
                             redirectTo={"/api/next-blog/dashboard/authors"}/>
    }

    return <></>
}

function Dashboard() {
    const dashboard = useDashboard()
    return <>
        <div style={{
            minWidth: "50dvw",
            maxWidth: "600px",
            margin: "0 auto",
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
            <ul style={{listStyleType: "none", padding: "0", margin: "0"}}>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <button onClick={() => dashboard.setPage("dashboard/blogs")}
                            style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Blogs
                    </button>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <button onClick={() => dashboard.setPage("dashboard/tags")}
                            style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Tags
                    </button>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <button onClick={() => dashboard.setPage("dashboard/categories")}
                            style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Categories
                    </button>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <button onClick={() => dashboard.setPage("dashboard/authors")}
                            style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Authors
                    </button>
                </li>
            </ul>
        </div>
    </>

}

function CommonLanding({title, ep, createUrl, updateUrlBase}: {
    title: string,
    ep: string,
    createUrl: string,
    updateUrlBase: string
}) {
    const dashboard = useDashboard()
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        setLoading(true)
        fetch(ep)
            .then(resp => resp.json())
            .then(items => setItems(items))
            .finally(() => setLoading(false))
    }, [])

    function onItemClick(id: string) {
        dashboard.setPage(`${updateUrlBase}/${id}`)
    }

    function onCreateClick() {
        dashboard.setPage(createUrl)
    }

    return <div style={{minWidth: "50dvw", padding: "20px", maxWidth: "600px", margin: "auto"}}>
        <div style={{display: "flex"}}>
            <div style={{flexGrow: 1}}>{title}</div>
            <button onClick={() => onCreateClick()} style={{
                display: "inline-block",
                marginBottom: "20px",
                backgroundColor: "#007bff",
                color: "#ffffff",
                padding: "10px 15px",
                borderRadius: "5px",
                textDecoration: "none"
            }}>
                Create
            </button>
        </div>
        {loading && <>loading...</>}
        <ul style={{listStyleType: "none", padding: "0", margin: "0"}}>
            {items.map((item, index) => (
                <li key={index} style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <button onClick={() => onItemClick(item._id)}
                            style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>
                        {item.title}
                    </button>
                </li>
            ))}
        </ul>
    </div>
}

interface CommonUpdateProps {
    fields: DynamicFormFieldType[];
    dataFrom: string;
    id: string;
    postTo: string;
    redirectTo: string;
}

const CommonUpdate = (props: CommonUpdateProps) => {
    const {fields: fieldsRaw, dataFrom, id, postTo, redirectTo} = props;
    const [fields, setFields] = useState<DynamicFormFieldType[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(dataFrom)
            .then((resp) => resp.json())
            .then((item: { [key: string]: string }) => setFields(fieldsRaw.map((field) => ({
                ...field,
                value: item[field.key]
            }))))
            .catch((error) => {
                console.error('Error fetching data:', error);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !fields.length) return <div>Loading...</div>;

    return (
        <div style={{minWidth: "50dvw", maxWidth: "600px"}}>
            <DynamicForm
                redirectTo={redirectTo}
                submitLabel="Update"
                id={id}
                postTo={postTo}
                fields={fields}
            />
        </div>
    );
};

interface CommonCreateProps {
    fields: DynamicFormFieldType[];
    postTo: string;
    redirectTo: string;
}

const CommonCreate = (props: CommonCreateProps) => {
    const {fields, postTo, redirectTo} = props;
    const [loading, setLoading] = useState(false);

    if (loading || !fields.length) return <div>Loading...</div>;

    return (
        <div style={{minWidth: "50dvw", maxWidth: "600px"}}>
            <DynamicForm
                redirectTo={redirectTo}
                submitLabel="Create"
                id={"create"}
                postTo={postTo}
                fields={fields}
            />
        </div>
    )
        ;
};





