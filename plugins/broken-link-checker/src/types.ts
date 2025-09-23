export interface LinkCheckResult {
    url: string;
    status: number | string;
    ok?: boolean;
    error?: string;
}

export interface PostReference {
    postId: string;
    postTitle: string;
}

export interface BrokenLink {
    url: string;
    status: number | string;
    posts: PostReference[];
}

export interface ScanResponse {
    code: number;
    message: string;
    payload: BrokenLink[] | null;
}

export interface PluginState {
    isLoading: boolean;
    isScanning: boolean;
    report: BrokenLink[] | null;
    error: string | null;
    latestSdk: any | null;
}

export interface Blog {
    _id: string;
    title: string;
    content: string;
    status: string;
}