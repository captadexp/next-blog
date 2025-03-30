# Next-Blog API Reference

This document provides information about all available API endpoints in the Next-Blog system.

## Blogs

### GET Endpoints

- `GET /api/blogs` - Retrieve all blogs
- `GET /api/blogs/:id` - Retrieve a specific blog by ID

### POST Endpoints

- `POST /api/blogs/create` - Create a new blog
  ```http
  POST /api/blogs/create
  Content-Type: application/json
  
  {
    "title": "My New Blog Post",
    "slug": "my-new-blog-post",
    "content": "This is the content of my blog post",
    "category": "category-id",
    "tags": ["tag-id-1", "tag-id-2"]
  }
  ```

- `POST /api/blog/:id/update` - Update an existing blog
  ```http
  POST /api/blog/blog123/update
  Content-Type: application/json
  
  {
    "title": "Updated Blog Title",
    "slug": "updated-blog-slug",
    "content": "Updated content for my blog post",
    "category": "new-category-id",
    "tags": ["tag-id-1", "tag-id-3", "tag-id-4"]
  }
  ```

- `POST /api/blog/:id/delete` - Delete a blog
  ```http
  POST /api/blog/blog123/delete
  Content-Type: application/json
  ```

## Authors

### GET Endpoints

- `GET /api/authors` - Retrieve all authors
- `GET /api/authors/:id` - Retrieve a specific author by ID

### POST Endpoints

- `POST /api/authors/create` - Create a new author
  ```http
  POST /api/authors/create
  Content-Type: application/json
  
  {
    "name": "John Doe",
    "slug": "john-doe",
    "username": "johndoe",
    "email": "johndoe@example.com",
    "bio": "A short biography about John Doe",
    "password": "secure-password"
  }
  ```

- `POST /api/author/:id/update` - Update an existing author
  ```http
  POST /api/author/author123/update
  Content-Type: application/json
  
  {
    "name": "John Doe Updated",
    "slug": "john-doe-updated",
    "username": "johndoe_updated",
    "email": "john.doe@example.com",
    "bio": "Updated biography for John Doe"
  }
  ```

- `POST /api/author/:id/delete` - Delete an author
  ```http
  POST /api/author/author123/delete
  Content-Type: application/json
  ```

## Categories

### GET Endpoints

- `GET /api/categories` - Retrieve all categories
- `GET /api/categories/:id` - Retrieve a specific category by ID

### POST Endpoints

- `POST /api/categories/create` - Create a new category
  ```http
  POST /api/categories/create
  Content-Type: application/json
  
  {
    "name": "Technology",
    "description": "Articles about technology and innovation",
    "slug": "technology"
  }
  ```

- `POST /api/category/:id/update` - Update an existing category
  ```http
  POST /api/category/cat123/update
  Content-Type: application/json
  
  {
    "name": "Tech & Innovation",
    "description": "Updated description for the Technology category",
    "slug": "tech-innovation"
  }
  ```

- `POST /api/category/:id/delete` - Delete a category
  ```http
  POST /api/category/cat123/delete
  Content-Type: application/json
  ```

## Tags

### GET Endpoints

- `GET /api/tags` - Retrieve all tags
- `GET /api/tags/:id` - Retrieve a specific tag by ID

### POST Endpoints

- `POST /api/tags/create` - Create a new tag
  ```http
  POST /api/tags/create
  Content-Type: application/json
  
  {
    "name": "JavaScript",
    "slug": "javascript"
  }
  ```

- `POST /api/tag/:id/update` - Update an existing tag
  ```http
  POST /api/tag/tag123/update
  Content-Type: application/json
  
  {
    "name": "JavaScript ES6+",
    "slug": "javascript-es6"
  }
  ```

- `POST /api/tag/:id/delete` - Delete a tag
  ```http
  POST /api/tag/tag123/delete
  Content-Type: application/json
  ```

## Configuration

### GET Endpoints

- `GET /api/config` - Retrieve UI configuration

  This endpoint returns the UI customization options that were passed to the nextBlog initialization function.

  #### Response Example
  ```json
  {
    "code": 0,
    "message": "Configuration retrieved successfully",
    "payload": {
      "ui": {
        "logo": "https://example.com/logo.png",
        "theme": {
          "primaryColor": "#3498db",
          "secondaryColor": "#2ecc71",
          "darkMode": false
        },
        "branding": {
          "name": "My Blog CMS",
          "description": "A powerful blogging platform"
        },
        "features": {
          "comments": true,
          "search": true,
          "analytics": false
        },
        "navigation": {
          "menuItems": [
            {
              "label": "Dashboard",
              "path": "/dashboard",
              "icon": "home"
            },
            {
              "label": "Posts",
              "path": "/dashboard/blogs",
              "icon": "file-text"
            }
          ]
        }
      }
    }
  }
  ```

## User

### GET Endpoints

- `GET /api/me` - Retrieve current authenticated user

  This endpoint returns information about the currently authenticated user. It requires authentication.

  #### Response Example
  ```json
  {
    "code": 0,
    "message": "Current user retrieved successfully",
    "payload": {
      "_id": "author123",
      "name": "John Doe",
      "slug": "john-doe",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "bio": "A passionate writer and developer"
    }
  }
  ```

  Note: The password field is intentionally excluded from the response for security reasons.

## Response Format

All API responses follow this standard format:

```json
{
  "code": 0,
  "message": "Success message",
  "payload": {
  }
}
```

### Success Response Example

```json
{
  "code": 0,
  "message": "Blog created successfully",
  "payload": {
    "_id": "blog789",
    "title": "My New Blog Post",
    "content": "This is the content of my blog post",
    "slug": "my-new-blog-post",
    "category": "cat123",
    "tags": [
      "tag123",
      "tag456"
    ],
    "authorId": "auth123",
    "createdAt": 1648224053000,
    "updatedAt": 1648224053000
  }
}
```

### Error Response Example

```json
{
  "code": 404,
  "message": "Blog with ID 'blog999' not found"
}
```

### Error Handling

The API uses a custom error handling system that automatically maps errors to appropriate HTTP status codes:

| Error Type      | HTTP Status | Description                                   |
|-----------------|-------------|-----------------------------------------------|
| Success         | 200         | Successful response with payload              |
| BadRequest      | 400         | Invalid request format or parameters          |
| ValidationError | 400         | Input validation failed (extends BadRequest)  |
| Unauthorized    | 401         | Authentication required                       |
| Forbidden       | 403         | Authenticated but not authorized              |
| NotFound        | 404         | Resource not found                            |
| Exception       | Varies      | Base error type (defaults to 500)             |
| DatabaseError   | 500         | Database operation failed (extends Exception) |

For client applications, check the HTTP status code and the error message to determine what went wrong.

## Authentication

Most API endpoints require authentication. Include an authentication token in the request headers.