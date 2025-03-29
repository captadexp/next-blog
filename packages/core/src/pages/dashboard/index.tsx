import {h} from "preact"
import BasePage from "../../components/utils/BasePage";
import {useEffect} from "preact/compat";

export default function dashboard() {

    function eff() {
        alert("magix")
        console.log("test")
    }

    useEffect(() => {
        console.log("wow")
    }, [])

    return <BasePage>
        <div style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
            <button type={"submit"} onClick={eff}>hello</button>
            <ul style={{listStyleType: "none", padding: "0", margin: "0"}}>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <a href={"/api/next-blog/dashboard/blogs"}
                       style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Blogs</a>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <a href={"/api/next-blog/dashboard/tags"}
                       style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Tags</a>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <a href={"/api/next-blog/dashboard/categories"}
                       style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Categories</a>
                </li>
                <li style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                    <a href={"/api/next-blog/dashboard/authors"}
                       style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>Authors</a>
                </li>
            </ul>
        </div>
    </BasePage>

}
