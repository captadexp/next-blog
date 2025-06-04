import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for API routes, Next.js internals, static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // We need to intercept /blog/* routes to check if they should be allowed based on the configured path
  // This handles direct access to the Next.js route handler path
  if (pathname.startsWith('/blog/')) {
    try {
      // Get the config to determine the valid blog base path
      const configUrl = new URL('/api/blog-config', request.url);

      const configResponse = await fetch(configUrl.toString());
      const configData = await configResponse.json();

      const configuredPath = configData.blogBasePath || '/blog';
      console.log(`[Middleware] Blog route accessed: ${pathname}, configured path: ${configuredPath}`);

      // Extract path segments and the blog slug
      const pathSegments = pathname.split('/').filter(Boolean);

      // If there are multiple segments after "/blog/", it could be a nested URL like "/blog/abcd/my-first-blog"
      // In this case, we should handle it specially to avoid redirect loops
      if (pathSegments.length > 2) {
        // This is likely a preview link with format /blog/[userId]/[slug]
        console.log(`[Middleware] Detected special preview format: ${pathname}`);
        // Allow it to proceed directly to the page handler
        return NextResponse.next();
      }

      // If the configured path is NOT /blog, this direct access should be blocked
      if (configuredPath !== '/blog') {
        console.log(`[Middleware] Blocking direct access to /blog/* when configured path is ${configuredPath}`);

        // Get the slug from the pathname - extract just the last segment to avoid path accumulation
        const slug = pathSegments[pathSegments.length - 1];

        // Instead of showing 404, redirect to the correct path
        const path = configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`;
        const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
        const correctPath = `${cleanPath}/${slug}`;
        console.log(`[Middleware] Rewriting to correct path: ${correctPath}`);

        return NextResponse.rewrite(new URL(correctPath, request.url));
      }
    } catch (error) {
      console.error('[Middleware] Error checking blog path configuration:', error);
    }

    // If we reach here, either the configured path is /blog (the default) or we couldn't check
    // So we allow the request to proceed
    return NextResponse.next();
  }

  // For any other path, check if it should be treated as a blog path
  // First, call our API route to determine if this is a blog path
  try {
    const url = new URL('/api/blog-redirect', request.url);
    url.searchParams.set('path', pathname);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.isBlogPath) {
      // If it's a blog path, redirect to the universal blog handler
      // We have a catch-22 here: Next.js routing requires paths under /blog/[...slug]
      // but we want to support custom paths like /blogs/abc/my-post

      // Extract the configured path for debugging
      const configuredPath = data.blogBasePath || '/blog';

      if (data.type === 'index') {
        // For index pages, we still redirect to /blog since that's where our page handler is
        console.log(`[Middleware] Redirecting blog index path ${pathname} to /blog (configured path: ${configuredPath})`);
        return NextResponse.redirect(new URL('/blog', request.url));
      } else if (data.type === 'post') {
        // Check if this access is through the correct configured path
        // Extract the slug properly to avoid path accumulation
        const requestPathSegments = pathname.split('/').filter(Boolean);
        const slug = requestPathSegments[requestPathSegments.length - 1];
        const configuredPath = data.blogBasePath || '/blog';

        // Parse configured path into segments for segment-by-segment comparison
        const configPathSegments = configuredPath.split('/').filter(Boolean);
        
        // Remove the slug from requestPathSegments for comparison
        const basePathSegments = [...requestPathSegments];
        basePathSegments.pop(); // Remove the slug segment
        
        // Convert to path strings for logging
        const basePath = '/' + basePathSegments.join('/');
        const configPath = configuredPath.endsWith('/') ? configuredPath.slice(0, -1) : configuredPath;
        
        console.log(`[Middleware] Comparing paths - Request base: "${basePath}", Configured: "${configPath}"`);
        console.log(`[Middleware] Base segments: [${basePathSegments.join(', ')}], Config segments: [${configPathSegments.join(', ')}]`);
        
        // Check if the path segments match (ignoring the slug)
        const pathsMatch = basePathSegments.length === configPathSegments.length && 
          basePathSegments.every((segment, i) => segment === configPathSegments[i]);
        
        if (pathsMatch) {
          // This is a correct path access, check if we're already at /blog/slug
          // If so, just proceed instead of redirecting
          if (pathname.startsWith('/blog/')) {
            console.log(`[Middleware] Already at /blog path, proceeding without redirect: ${pathname}`);
            return NextResponse.next();
          }
          console.log(`[Middleware] Correct blog path access: ${pathname} matches ${configuredPath}, rewriting to handler`);
          // Use rewrite instead of redirect when the configured path is not '/blog'
          // This allows the internal route to be processed without changing the URL
          if (configuredPath !== '/blog') {
            return NextResponse.rewrite(new URL(`/blog/${slug}`, request.url));
          } else {
            return NextResponse.redirect(new URL(`/blog/${slug}`, request.url));
          }
        } else {
          // This is an incorrect path access, block it by redirecting to the correct path
          console.log(`[Middleware] Incorrect blog path: ${pathname} does not match ${configuredPath}, redirecting to correct path`);
          const path = configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`;
          const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
          return NextResponse.redirect(new URL(`${cleanPath}/${slug}`, request.url));
        }
      }
    }
  } catch (error) {
    console.error('Error in middleware:', error);
  }

  return NextResponse.next();
}