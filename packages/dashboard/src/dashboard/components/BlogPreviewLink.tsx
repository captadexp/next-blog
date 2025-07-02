import {h, FunctionComponent} from 'preact';
import {useUser} from '../../context/UserContext';
import {Blog} from '../../types/api';
import {generateBlogPreviewUrl} from '../../utils/urlHelpers';
import {useState, useEffect} from 'preact/hooks';

interface BlogPreviewLinkProps {
    blog: Blog;
}

export const BlogPreviewLink: FunctionComponent<BlogPreviewLinkProps> = ({blog}) => {
    const {config, apis} = useUser();
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!blog.slug) return;

        // First try to get the URL from the API
        const fetchPreviewUrl = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Use the API method (which now has built-in fallback)
                if (apis?.getBlogPreviewUrl) {
                    console.log('[BlogPreviewLink] Fetching preview URL for slug:', blog.slug);
                    console.log('[BlogPreviewLink] Current config.blogBasePath:', config?.blogBasePath);
                    const response = await apis.getBlogPreviewUrl(blog.slug);
                    console.log('[BlogPreviewLink] Preview URL API response:', response);

                    if (response.code === 0 && response.data) {
                        setPreviewUrl(response.data);
                        return;
                    }
                } else {
                    // Unlikely fallback if the API method is somehow not available
                    const basePath = config?.blogBasePath || '/blog';
                    console.log('[BlogPreviewLink] API method not available, generating URL with basePath:', basePath);
                    const url = generateBlogPreviewUrl(blog.slug, basePath, true);
                    console.log('[BlogPreviewLink] Generated preview URL:', url);
                    setPreviewUrl(url);
                }
            } catch (err) {
                console.error('Error fetching preview URL:', err);
                setError('Failed to generate preview URL');

                // Fallback to client-side generation
                try {
                    // Even if the API call failed, we can try using the client-side method directly
                    if (apis?.getBlogPreviewUrl) {
                        // Try a direct client-side generation without hitting the server
                        const basePath = config?.blogBasePath || '/blog';
                        const url = generateBlogPreviewUrl(blog.slug, basePath, true);
                        console.log('[BlogPreviewLink] Fallback generated preview URL:', url);
                        setPreviewUrl(url);
                    }
                } catch (fallbackErr) {
                    console.error('Fallback preview URL generation also failed:', fallbackErr);
                }
            } finally {
                setIsLoading(false);
            }
        };

        // Always refetch when the slug or config changes (especially blogBasePath)
        fetchPreviewUrl();
    }, [blog.slug, config?.blogBasePath, apis]);

    if (!blog.slug) {
        return (
            <div className="text-yellow-600 text-sm italic">
                No preview available (missing slug)
            </div>
        );
    }

    const handleCopyClick = () => {
        navigator.clipboard.writeText(previewUrl)
            .then(() => {
                // Could add a toast notification here
                console.log('Preview URL copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy URL:', err);
            });
    };

    return (
        <div>
            <p className="text-sm font-medium mb-1">Preview URL:</p>
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    {isLoading ? (
                        <div className="bg-gray-50 p-1.5 rounded text-sm flex-grow text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Loading preview URL...
                        </div>
                    ) : (
                        <code className="bg-gray-50 p-1.5 rounded text-sm flex-grow overflow-x-auto border border-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {previewUrl}
                        </code>
                    )}
                    <button
                        type="button"
                        onClick={handleCopyClick}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Copy URL"
                        disabled={isLoading || !previewUrl}
                    >
                        <i className="icon-copy"></i>
                    </button>
                </div>
                {/* Display error message if there was an error */}
                {error && (
                    <div className="text-xs text-red-500 mb-1">
                        {error}
                    </div>
                )}
                {/* Display note about custom path if not the default /blog */}
                {config?.blogBasePath && config.blogBasePath !== '/blog' && (
                    <div className="text-xs text-gray-500 mb-1 italic">
                        Using custom blog path: {config.blogBasePath}
                    </div>
                )}
            </div>
            <div className="mt-1">
                <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 hover:text-blue-800 text-sm inline-flex items-center ${
                        isLoading || !previewUrl ? 'pointer-events-none opacity-50' : ''
                    }`}
                >
                    <span>Open preview</span>
                    <i className="icon-external-link ml-1"></i>
                </a>
            </div>
        </div>
    );
};