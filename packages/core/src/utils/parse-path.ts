export function getParamFromUrl(url: string, template: string, param: string): {
    params: Record<string, string>,
    templatePath: string
} | null {
    const urlSegments = new URL(url).pathname.split('/').filter(Boolean);
    const templateSegments = template.split('/').filter(Boolean);

    if (urlSegments.length !== templateSegments.length) {
        return null;
    }

    const params = templateSegments.reduce((acc, cur, index) => {
        if (cur.startsWith(':')) {
            acc[cur.slice(1)] = urlSegments[index];
        }
        return acc;
    }, {} as Record<string, string>);

    const templatePath = templateSegments.join('/');

    return params[param] ? {params, templatePath} : null;
}

export type PathMatchResult = {
    handler: Function | null;
    templatePath: string;
    params: Record<string, string>;
};

export type PathObject = { [key: string]: PathObject | Function };

export function matchPathToFunction(pathObject: PathObject, url: string): PathMatchResult {
    const cleanUrl = url.split('?')[0].replace(/^\/|\/$/g, '');
    const segments = cleanUrl.split('/').filter(Boolean);

    function isPathObject(obj: any): obj is PathObject {
        return typeof obj === 'object' && obj !== null && !(obj instanceof Function);
    }

    function traverse(
        obj: PathObject | Function,
        index: number,
        pathAccumulator: string[],
        params: Record<string, string>
    ): Function | null {

        // Base Case: We've consumed all URL segments
        if (index >= segments.length) {
            if (typeof obj === 'function') {
                return obj;
            }
            if (isPathObject(obj)) {
                // Check for a standard index route '*'
                if (typeof obj["*"] === 'function') {
                    pathAccumulator.push('*');
                    return obj["*"] as Function;
                }
                // Check if a catch-all '[...]' can act as an index route
                if (typeof obj["[...]"] === 'function') {
                    pathAccumulator.push('[...]');
                    // The catch-all is empty, but we should note it.
                    params['catchAll'] = '';
                    return obj["[...]"] as Function;
                }
            }
            return null;
        }

        if (!isPathObject(obj)) {
            return null;
        }

        const segment = segments[index];
        let handler: Function | null = null;

        // 1. Static match (highest priority)
        if (obj.hasOwnProperty(segment)) {
            pathAccumulator.push(segment);
            handler = traverse(obj[segment], index + 1, pathAccumulator, params);
            if (handler) return handler;
            pathAccumulator.pop(); // Backtrack
        }

        // 2. Dynamic parameter match (:id)
        for (const key in obj) {
            if (key.startsWith(':')) {
                pathAccumulator.push(key);
                const paramName = key.substring(1);
                params[paramName] = segment; // Add param

                handler = traverse(obj[key], index + 1, pathAccumulator, params);

                if (handler) return handler;

                // Backtrack if this path didn't lead to a handler
                delete params[paramName];
                pathAccumulator.pop();
            }
        }

        // 3. Deep catch-all match ([...])
        if (obj.hasOwnProperty('[...]')) {
            const catchAllHandler = obj['[...]'];
            if (typeof catchAllHandler === 'function') {
                pathAccumulator.push('[...]');
                params['catchAll'] = segments.slice(index).join('/');
                return catchAllHandler;
            }
        }

        // 4. Single-level wildcard match (*)
        if (obj.hasOwnProperty('*')) {
            pathAccumulator.push('*');
            handler = traverse(obj['*'], index + 1, pathAccumulator, params);
            if (handler) return handler;
            pathAccumulator.pop(); // Backtrack
        }

        return null;
    }

    const pathAccumulator: string[] = [];
    const params: Record<string, string> = {};
    const handler = traverse(pathObject, 0, pathAccumulator, params);

    return {
        handler,
        templatePath: handler ? pathAccumulator.join('/') : '',
        params: handler ? params : {},
    };
}

const routeCache = new Map<string, PathMatchResult>();

export function getCachedMatch(pathObject: PathObject, url: string): PathMatchResult {
    if (routeCache.has(url)) {
        return routeCache.get(url)!;
    }

    const result = matchPathToFunction(pathObject, url);

    // Only cache successful matches to avoid polluting the cache with 404s
    if (result.handler) {
        // You might want to cap the cache size in a real app
        if (routeCache.size > 1000) {
            const firstKey = routeCache.keys().next().value!;
            routeCache.delete(firstKey);
        }
        routeCache.set(url, result);
    }

    return result;
}