import BasePage from "../utils/BasePage";
import React from "react";

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
        <div style={{padding: "20px", maxWidth: "600px", margin: "auto"}}>
            <a href={createUrl} style={{
                display: "inline-block",
                marginBottom: "20px",
                backgroundColor: "#007bff",
                color: "#ffffff",
                padding: "10px 15px",
                borderRadius: "5px",
                textDecoration: "none"
            }}>{createBtnText}</a><br/>
            <ul style={{listStyleType: "none", padding: "0", margin: "0"}}>
                {items.map((item, index) => (
                    <li key={index} style={{borderBottom: "1px solid #eee", padding: "10px"}}>
                        <a href={`${itemLinkBasePath}${item._id}`}
                           style={{textDecoration: "none", color: "#007bff", fontSize: "16px"}}>
                            {item.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    </BasePage>
}
