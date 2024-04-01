import {Blog, Tag} from "../database";
import React from "react";

export default function TagUI({tag, blogs}: { tag: Tag, blogs: Blog[] }) {
    return <div>Show Tag: {tag.name}</div>;
}
