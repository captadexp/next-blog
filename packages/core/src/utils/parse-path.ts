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
}

export function matchPathToFunction(pathObject: PathObject, url: string): PathMatchResult {
    const segments = url.split('/').filter(Boolean); // Split and remove empty segments

    function isPathObject(obj: PathObject | Function): obj is PathObject {
        return typeof obj === 'object' && !(obj instanceof Function);
    }

    function traverse(obj: PathObject | Function, index: number, pathAccumulator: string[]): PathMatchResult {

        if (index >= segments.length) {
            if (typeof obj === 'function') {
                return {handler: obj, templatePath: pathAccumulator.join('/'), params: {}};
            } else if (isPathObject(obj) && typeof obj[""] === 'function') {
                return {handler: obj[""] as Function, templatePath: pathAccumulator.join('/'), params: {}};
            }
            return {templatePath: pathAccumulator.join('/'), handler: null, params: {}};
        }

        if (!isPathObject(obj)) {
            return {templatePath: pathAccumulator.join('/'), handler: null, params: {}};
        }

        const segment = segments[index];
        if (obj.hasOwnProperty(segment)) {
            return traverse(obj[segment], index + 1, [...pathAccumulator, segment]);
        } else {
            for (const key in obj) {
                if (key.startsWith(":")) {
                    const result = traverse(obj[key], index + 1, [...pathAccumulator, key]);
                    if (result.handler) {
                        const params = {...result.params, [key.substring(1)]: segment}; // Placeholder for actual parameter extraction logic
                        return {...result, params};
                    }
                }
            }
            if (obj.hasOwnProperty("")) {
                return traverse(obj[""], index + 1, [...pathAccumulator, ""]);
            }
        }

        return {templatePath: pathAccumulator.join('/'), handler: null, params: {}};
    }

    return traverse(pathObject, 0, []);
}

export type PathObject = { [key: string]: PathObject | Function };
