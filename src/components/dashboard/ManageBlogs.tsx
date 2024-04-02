import React from "react";


export default function ManageBlogs() {
    return <html lang="en">
    <head>
        <meta charSet="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Create Blog</title>
    </head>
    <body>
    <form id="createBlogForm">
        <input type="text" id="title" name="title" placeholder="Title" required/><br/>
        <input type="text" id="slug" name="slug" placeholder="Slug" required/><br/>
        <textarea id="content" name="content" placeholder="Content" required></textarea><br/>
        <input type="text" id="category" name="category" placeholder="Category" required/><br/>
        <input type="text" id="tags" name="tags" placeholder="Tags (comma-separated)" required/><br/>
        <input type="text" id="author" name="author" placeholder="Author" required/><br/>
        <button type="submit">Create Blog</button>
    </form>

    <script type="application/javascript" dangerouslySetInnerHTML={{
        __html: `document.getElementById('createBlogForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const formData = {
        title: document.getElementById('title').value,
        slug: document.getElementById('slug').value,
        content: document.getElementById('content').value,
        category: document.getElementById('category').value,
        tags: document.getElementById('tags').value.split(','),
        author: document.getElementById('author').value,
    };

    fetch('/api/sgai-blog/api/blogs/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        // Handle success response, maybe clear the form or redirect
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
`
    }}>
    </script>
    </body>
    </html>
}
