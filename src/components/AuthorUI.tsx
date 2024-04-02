import {Author, Blog, Tag} from "../database";
import React from "react";

export default function AuthorUI({tag}: { tag: Author }) {
    return <div>Show Author: {tag.name}</div>;
}
