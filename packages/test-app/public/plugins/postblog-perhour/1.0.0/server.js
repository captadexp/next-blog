(() => {
    const topics = [
        "The Future of Renewable Energy",
        "A Beginner's Guide to Machine Learning",
        "The Importance of Mindfulness in a Hectic World",
        "Exploring the Deep Sea: Earth's Final Frontier",
        "The Rise of Vertical Farming",
        "Understanding Blockchain Technology Beyond Cryptocurrency",
        "The Impact of Remote Work on Urban Development",
        "DIY Home Automation on a Budget",
        "The Science of a Good Night's Sleep",
        "A Culinary Tour of Southeast Asia"
    ];

    const generateAIBlogContent = async (topic, apiKey) => {
        // This function remains the same
        console.log(`Generating AI content for topic: ${topic}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Write a detailed blog post about "${topic}".`
                        }
                    ]
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            console.error('Gemini API response did not contain content candidates:', data);
            throw new Error('No AI-generated content received.');
        }

        return data.candidates[0].content.parts[0].text;
    };

    const createAndPublishAIBlog = async (sdk) => {
        // This function remains the same
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable not set.');
        }
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const content = await generateAIBlogContent(topic, apiKey);
        const blog = await sdk.db.blogs.create({
            title: topic,
            slug: topic.toLowerCase().replace(/ /g, '-'),
            content,
            status: 'draft',
            author: 'AI',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: { source: 'gemini-ai-post' }
        });
        console.log(`Successfully created AI-generated blog with ID ${blog._id}`);
        return blog;
    };

    return {
        hooks: {
            'scheduled-blog-post': async (sdk, context) => {
                const logger = sdk.log;

                const now = new Date();
                const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
                const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
                const currentISTHour = nowIST.getUTCHours();
                const currentISTMinute = nowIST.getUTCMinutes();

                const scheduledTimes = [
                    { hour: 10, minute: 0 },
                    { hour: 12, minute: 30 }, // Only for testing purpose
                    { hour: 17, minute: 0 }
                ];

                const isScheduledTime = scheduledTimes.some(
                    (time) => time.hour === currentISTHour && time.minute === currentISTMinute
                );

                if (isScheduledTime) {
                    try {
                        logger.info(
                            `Plugin: It's ${currentISTHour}:${currentISTMinute < 10 ? '0' : ''}${currentISTMinute} IST. Time to generate a scheduled post.`
                        );
                        await createAndPublishAIBlog(sdk);
                    } catch (error) {
                        logger.error('Plugin Error: Failed to generate scheduled blog post:', error);
                    }
                } else {
                    logger.info(
                        `Plugin: Current time ${currentISTHour}:${currentISTMinute < 10 ? '0' : ''}${currentISTMinute} is not a scheduled time. Skipping.`
                    );
                }

                return context;
            }
        }
    };
})();
