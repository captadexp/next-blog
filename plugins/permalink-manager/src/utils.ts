import {useEffect} from "@supergrowthai/plugin-dev-kit/client";

export function useDebouncedEffect(fn: () => void, delay: number, deps: any[]) {
    useEffect(() => {
        const t = setTimeout(fn, delay);
        return () => clearTimeout(t);
    }, [delay, ...deps]);
}