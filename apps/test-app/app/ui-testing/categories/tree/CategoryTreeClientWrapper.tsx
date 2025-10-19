'use client';

import {CategoryTree} from "@supergrowthai/next-blog-ui";
import {Category} from "@supergrowthai/next-blog";

export default function ({categories}: { categories: Category[ ] }) {
    return <CategoryTree categories={categories}/>
}