(() => {
    'use strict';

    // This is a client-side implementation that shows AI generation info on the blog update page
    console.log('AI Blog Generator client initialized');

    function editorSidebarWidget(sdk, previous, context) {
        // Check if we have a blog context
        if (!context || !context.blogId) {
            return ['div', {class: 'hidden'}];
        }

        // Get the blog data from the context
        const getBlogData = async () => {
            try {
                // Fetch the blog data
                const response = await sdk.apis.getBlog(context.blogId);
                if (response.code !== 0) {
                    throw new Error(response.message);
                }

                const blog = response.payload;

                // Check if the blog was AI-generated
                const isAIGenerated = blog.metadata &&
                    (blog.metadata.isAIGenerated || blog.metadata.source === 'ai-blog-generator');

                if (isAIGenerated) {
                    // Show AI generation info
                    return ['div', {class: 'bg-blue-50 border border-blue-200 rounded-md p-4 mb-4'},
                        ['h3', {class: 'text-lg font-medium text-blue-800 mb-2'}, 'AI Generated Content'],
                        ['p', {class: 'text-sm text-blue-600 mb-2'},
                            'This blog post was automatically generated using artificial intelligence.'],
                        ['p', {class: 'text-xs text-blue-500'},
                            `Generation method: ${blog.metadata.generationMethod || 'OpenAI'}`],
                        ['p', {class: 'text-xs text-blue-500'},
                            `Generated at: ${new Date(blog.metadata.generatedAt).toLocaleString()}`]
                    ];
                }

                // Not AI-generated, return empty div
                return ['div', {class: 'hidden'}];
            } catch (error) {
                console.error('Error fetching blog data:', error);
                return ['div', {class: 'bg-red-50 border border-red-200 rounded-md p-4 mb-4'},
                    ['p', {class: 'text-sm text-red-600'},
                        `Error checking AI generation status: ${error.message}`]
                ];
            }
        };

        // Initial loading state
        sdk.refresh();
        getBlogData()
            .then(uiTree => {
                previous = uiTree;
                sdk.refresh();
            });

        return previous || ['div', {class: 'bg-gray-50 border border-gray-200 rounded-md p-4 mb-4'},
            ['p', {class: 'text-sm text-gray-600'}, 'Checking AI generation status...']
        ];
    }

    return {
        hooks: {
            'editor-sidebar-widget': editorSidebarWidget
        }
    };
})()
