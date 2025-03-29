# Dashboard Client-Side Routing Implementation

This document outlines the steps to implement client-side routing for the Next-Blog dashboard using Preact.

## Architecture

- **Client-side routing**: Use `preact-router` for navigation between dashboard pages
- **Code organization**: Each page in a separate file, combined via a router
- **Code splitting**: Leverage dynamic imports for better performance
- **Static file serving**: Use the already implemented static file handler

## Implementation Steps

### 1. Install Dependencies

- [x] Install preact-router (Added to package.json)

### 2. Create Router Structure

- [x] Create a main dashboard app component with router
- [x] Set up route configuration
- [x] Implement Layout component with navigation

### 3. Convert Existing Pages

- [x] Convert dashboard index page to client component
- [x] Convert blogs list page (basic implementation)
- [ ] Implement blog create/update pages
- [ ] Convert authors pages
- [ ] Convert categories pages
- [ ] Convert tags pages

### 4. Update Build Configuration

- [ ] Configure Vite for code splitting
- [ ] Set up production optimizations

### 5. Improve Developer Experience

- [ ] Add hot module replacement support
- [ ] Implement debugging helpers

## Usage

The dashboard will be accessible at `/api/next-blog/dashboard` and will handle all routing client-side. The server will only serve the initial HTML shell and static assets.

## Implementation Details

### Route Structure

```
/dashboard               → Home/dashboard overview
/dashboard/blogs         → Blogs list
/dashboard/blogs/create  → Create new blog
/dashboard/blogs/:id     → Edit existing blog
/dashboard/authors       → Authors list
/dashboard/authors/create → Create new author
/dashboard/authors/:id   → Edit existing author
/dashboard/categories    → Categories list
/dashboard/categories/create → Create new category
/dashboard/categories/:id → Edit existing category
/dashboard/tags          → Tags list
/dashboard/tags/create   → Create new tag
/dashboard/tags/:id      → Edit existing tag
```

### File Structure

```
src/client/
├── dashboard/
│   ├── index.tsx           # Main entry point with router
│   ├── components/         # Shared components
│   │   ├── Layout.tsx      # Common layout (sidebar, header)
│   │   └── ... 
│   ├── pages/              # Page components
│   │   ├── Home.tsx        # Dashboard home
│   │   ├── blogs/
│   │   │   ├── List.tsx    # Blogs list
│   │   │   ├── Create.tsx  # Create blog
│   │   │   └── Edit.tsx    # Edit blog
│   │   ├── authors/        # Similar structure for authors
│   │   ├── categories/     # Similar structure for categories
│   │   └── tags/           # Similar structure for tags
│   └── utils/              # Client-side utilities
└── ...
```