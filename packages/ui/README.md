# @supergrowthai/next-blog-ui

React UI components for next-blog blogging platform.

## Installation

```bash
npm install @supergrowthai/next-blog-ui
```

## Usage

```typescript
import { BlogCard, BlogTitle, AuthorCard } from '@supergrowthai/next-blog-ui';
import '@supergrowthai/next-blog-ui/style.css';
```

## Components

### Blog Components

- `BlogTitle` - Renders blog title with configurable heading level
- `BlogContent` - Renders blog content
- `BlogAuthor` - Displays blog author information
- `BlogMeta` - Shows blog metadata (date, category, tags)
- `BlogExcerpt` - Displays blog excerpt

### General Components

- `BlogCard` - Card component for displaying blog previews
- `BlogGrid` - Grid layout for multiple blog cards
- `Pagination` - Pagination controls
- `RecentBlogs` - Recent blog posts list
- `RelatedBlogs` - Related blog posts list

### Author Components

- `AuthorCard` - Author information card
- `AuthorBio` - Author biography component
- `AuthorArticles` - List of articles by author
- `AuthorList` - List of authors
- `AuthorPage` - Complete author page layout

### Category Components

- `CategoryCard` - Category information card
- `CategoryList` - List of categories
- `CategoryPage` - Complete category page layout
- `CategoryTree` - Hierarchical category display
- `CategoryArticles` - Articles within a category

### Tag Components

- `TagCard` - Tag information card
- `TagList` - List of tags
- `TagPage` - Complete tag page layout
- `TagCloud` - Tag cloud display
- `TagArticles` - Articles with specific tag

### Layout Components

- `BlogLayout` - Main blog layout wrapper
- `MainSection` - Main content section
- `Aside` - Sidebar component

### SEO Components

- `MetaTags` - HTML meta tags for SEO
- `JsonLd` - JSON-LD structured data
- `Canonical` - Canonical URL links


## Component Properties

All components accept standard React HTML attributes and extend them with blog-specific properties. Most components accept a `style` prop for custom styling and follow TypeScript interfaces for type safety.

### Example: BlogCard

```typescript
interface BlogCardProps {
  blog: HydratedBlog;
  showImage?: boolean;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showTags?: boolean;
  showReadMore?: boolean;
  style?: React.CSSProperties;
  // ... additional style props
}
```

## TypeScript Support

All components are written in TypeScript and include type definitions. The package exports type definitions alongside the components.

## Styling

Components include built-in styles that can be customized through style props. Import the CSS file for default styling:

```typescript
import '@supergrowthai/next-blog-ui/style.css';
```

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev

# Type checking
npm run typecheck
```

## License

MIT