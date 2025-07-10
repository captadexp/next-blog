(() => {
    // OpenAI API key - hardcoded for now as per requirements
    const OPENAI_API_KEY = 'your-openai-api-key';

    // List of potential blog topics
    const TOPICS = [
        'Artificial Intelligence',
        'Machine Learning',
        'Web Development',
        'JavaScript Frameworks',
        'Cloud Computing',
        'Cybersecurity',
        'Data Science',
        'Blockchain Technology',
        'Internet of Things',
        'Mobile App Development',
        'DevOps',
        'Software Engineering Best Practices',
        'UI/UX Design',
        'Digital Marketing',
        'E-commerce Trends',
        'Remote Work',
        'Productivity Tools',
        'Tech Startups',
        'Sustainable Technology',
        'Future of Computing'
    ];

    // Function to get a random topic from the list
    const getRandomTopic = () => {
        const randomIndex = Math.floor(Math.random() * TOPICS.length);
        return TOPICS[randomIndex];
    };

    // Function to call OpenAI API to generate blog content
    const generateBlogContent = async (topic) => {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional blog writer. Create a well-structured blog post with a title, introduction, several sections with subheadings, and a conclusion.'
                        },
                        {
                            role: 'user',
                            content: `Write a comprehensive blog post about ${topic}. Include a catchy title, an engaging introduction, at least 3 main sections with subheadings, and a conclusion. The blog should be informative and around 800 words.`
                        }
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating blog content:', error);
            throw error;
        }
    };

    // Function to create a new draft blog post
    const createDraftBlog = async (sdk, title, content) => {
        try {
            // Extract title from the generated content if not provided
            if (!title) {
                const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m);
                title = titleMatch ? titleMatch[1] : 'Generated Blog Post';
            }

            // Create a new draft blog post
            const blog = await sdk.db.blogs.create({
                title,
                content,
                status: 'draft',
                author: 'AI Generator',
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    source: 'ai-blog-generator',
                    generatedAt: new Date().toISOString(),
                    isAIGenerated: true, // Clearly indicate it was AI-generated
                    generationMethod: 'OpenAI GPT-3.5 Turbo'
                }
            });

            return blog;
        } catch (error) {
            console.error('Error creating draft blog:', error);
            throw error;
        }
    };

    // Function to check if it's time to generate a new blog (every 3 hours)
    const shouldGenerateBlog = async (sdk) => {
        try {
            // Get the last generated blog
            const lastBlog = await sdk.db.blogs.findOne({
                'metadata.source': 'ai-blog-generator'
            }, {
                sort: {createdAt: -1}
            });

            if (!lastBlog) {
                console.log('AI Blog Generator: No previous blog found, generating first blog');
                return true;
            }

            const lastGeneratedTime = new Date(lastBlog.createdAt);
            const currentTime = new Date();

            // Calculate the time difference in hours
            const hoursDifference = (currentTime - lastGeneratedTime) / (1000 * 60 * 60);

            console.log(`AI Blog Generator: Hours since last generation: ${hoursDifference.toFixed(2)}`);

            // Generate a new blog if more than 3 hours have passed
            return hoursDifference >= 3;
        } catch (error) {
            console.error('Error checking last blog generation time:', error);
            return false;
        }
    };

    return {
        hooks: {
            'every-minute-cron': async (sdk, context) => {
                try {
                    console.log('AI Blog Generator: Checking if it\'s time to generate a new blog');

                    // Check if it's time to generate a new blog
                    const shouldGenerate = await shouldGenerateBlog(sdk);

                    if (!shouldGenerate) {
                        console.log('AI Blog Generator: Skipping blog generation, less than 3 hours since last generation');
                        return {
                            success: true,
                            message: 'Skipped blog generation, less than 3 hours since last generation',
                            generated: false
                        };
                    }

                    console.log('AI Blog Generator: Starting blog generation process');

                    // Get a random topic
                    const topic = getRandomTopic();
                    console.log(`AI Blog Generator: Selected topic - ${topic}`);

                    // Generate blog content using OpenAI
                    const content = await generateBlogContent(topic);
                    console.log('AI Blog Generator: Successfully generated blog content');

                    // Create a new draft blog post
                    const blog = await createDraftBlog(sdk, null, content);
                    console.log(`AI Blog Generator: Created draft blog with ID ${blog._id}`);

                    return {
                        success: true,
                        message: `Successfully generated blog about ${topic}`,
                        blogId: blog._id,
                        generated: true
                    };
                } catch (error) {
                    console.error('AI Blog Generator error:', error);
                    return {
                        success: false,
                        message: `Failed to generate blog: ${error.message}`,
                        generated: false
                    };
                }
            }
        }
    };
})()
