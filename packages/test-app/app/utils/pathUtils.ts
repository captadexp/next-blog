/**
 * Parses the URL path segments to check if it matches a blog post URL pattern
 * based on the configured blog base path.
 * 
 * @param segments The URL path segments
 * @param blogBasePath The configured base path for blog URLs (e.g., "/blog" or "/blog/abc")
 * @returns Object containing whether it's a blog post and the extracted slug if it is
 */
export function parsePathSegments(segments: string[], blogBasePath: string) {
  // Normalize the blog base path
  const normalizedBasePath = blogBasePath.startsWith("/") 
    ? blogBasePath.substring(1) 
    : blogBasePath;
  
  // Split the base path into segments
  const basePathSegments = normalizedBasePath.split("/").filter(Boolean);
  
  // If we don't have enough segments to match the base path + slug, it's not a blog URL
  if (segments.length < basePathSegments.length + 1) {
    return { isBlogPost: false, slug: null };
  }
  
  // Check if the initial segments match our blog base path
  for (let i = 0; i < basePathSegments.length; i++) {
    if (segments[i] !== basePathSegments[i]) {
      return { isBlogPost: false, slug: null };
    }
  }
  
  // The last segment after the base path should be the slug
  const slug = segments[segments.length - 1];
  
  return { isBlogPost: true, slug };
}

/**
 * Generates a blog post URL based on the slug and configured base path
 * 
 * @param slug The blog post slug
 * @param blogBasePath The configured base path (e.g., "/blog" or "/blog/abc")
 * @returns The complete URL path for the blog post
 */
export function generateBlogUrl(slug: string, blogBasePath: string = "/blog") {
  // Ensure the base path starts with a slash
  const normalizedBasePath = blogBasePath.startsWith("/") 
    ? blogBasePath 
    : "/" + blogBasePath;
  
  // Ensure the base path doesn't end with a slash
  const trimmedBasePath = normalizedBasePath.endsWith("/") 
    ? normalizedBasePath.slice(0, -1) 
    : normalizedBasePath;
  
  // Ensure the slug doesn't start with a slash
  const normalizedSlug = slug.startsWith("/") ? slug.slice(1) : slug;
  
  // Combine to form the complete URL
  return `${trimmedBasePath}/${normalizedSlug}`;
}