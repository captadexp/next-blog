(function () {

    let cachedData = null;

    return ({
        name: "API Widget",
        version: "1.0.0",
        description: "A simple widget that fetches data and uses the refresh function.",
        hooks: {
            'dashboard-widget': (sdk) => {
                // This variable acts as a simple module-level cache.
                // It will persist between re-renders triggered by `sdk.refresh()`.

                const fetchData = async (sdk) => {
                    cachedData = {title: "Loading..."};
                    sdk.refresh(); // Refresh immediately to show "Loading..."

                    try {
                        const response = await sdk.api.getBlogs();
                        if (response.code === 0 && response.payload.length > 0) {
                            cachedData = response.payload[0];
                        } else {
                            cachedData = {title: "Could not fetch latest blog."};
                        }
                    } catch (err) {
                        console.log(err);
                        cachedData = {title: `Error: ${err.message}`};
                    }

                    // After the API call is done, refresh again with the final data.
                    sdk.refresh();
                };

                // If we have no data yet, trigger the initial fetch.
                if (cachedData === null) {
                    // Use a setTimeout to avoid an infinite loop if the API fails instantly.
                    setTimeout(() => fetchData(sdk), 0);
                    return ['p', {}, 'Initializing widget...'];
                }

                // Render the UI based on the current `cachedData`.
                return [
                    'div', {class: 'p-4 border border-gray-100 rounded my-2'},
                    ['h3', {class: 'font-bold'}, 'Latest Blog Post'],
                    ['p', {}, cachedData.title],
                    [
                        'button',
                        {
                            type: 'button',
                            onClick: fetchData,
                            class: 'btn mt-2 p-2 border border-gray-100 rounded'
                        },
                        'Refresh Data'
                    ]
                ];
            }
        },

        postInstall: async function (db, pluginId) {
            console.log("Installing Hello Dolly plugin...");

            try {
                // Register hooks for both server and client components
                const hooks = [
                    // Client-side hook (will be used by the client component)
                    {hookName: 'dashboard-widget', priority: 10}
                ];

                // Create hook mappings in the database
                for (const hook of hooks) {
                    await db.pluginHookMappings.create({
                        pluginId: pluginId,
                        hookName: hook.hookName,
                        priority: hook.priority
                    });
                    console.log(`Registered hook: ${hook.hookName}`);
                }

                console.log("Hello Dolly plugin installed successfully!");
                return true;
            } catch (error) {
                console.error("Error installing Hello Dolly plugin:", error);
                return false;
            }
        }
    })
})()