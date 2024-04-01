import {Blog, Category} from "../database";
import React from "react";

export default function CategoryUI({category, blogs}: { category: Category, blogs: Blog[] }) {
    return <div>
        Show Category: {category.name}
    </div>;
}
