import {Blog} from "../database";
import React from "react";
import moment from "moment"

export default function BlogUI({blog}: { blog: Blog }) {

    const time = moment(blog.createdAt)

    return <div className="space-y-8">
        <article className="p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">{blog.title}</h1>
            <p className="mb-4">Posted on <time
                dateTime={time.toISOString()}>{time.format("MMMM DD, YYYY")}</time></p>
            <p className="text-sm font-bold">By {blog.author}</p>
            <div className="[&>p]:py-2 [&>p>strong]:font-extrabold [&>ol]:list-disc"
                 dangerouslySetInnerHTML={{__html: blog.content}}/>
        </article>
    </div>;
}
