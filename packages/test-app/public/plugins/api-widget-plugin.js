(function () {
    let cachedData = null;

    function dashboardWidget(sdk, prev) {
        // This variable acts as a simple module-level cache.
        // It will persist between re-renders triggered by `sdk.refresh()`.

        const fetchData = async (sdk) => {
            cachedData = {title: "Loading..."};
            sdk.refresh(); // Refresh immediately to show "Loading..."

            try {
                const response = await sdk.apis.getBlogs();
                if (response.code === 0 && response.payload.length > 0) {
                    sdk.notify("Latest blog loaded");
                    cachedData = response.payload.at(-1);
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

    return ({
        name: "API Widget",
        version: "1.0.0",
        description: "A simple widget that fetches data and uses the refresh function.",
        hooks: {
            'dashboard-widget': dashboardWidget,
        },

        postInstall: async function (db, pluginId) {
            console.log("Running post-install setup for API Widget plugin...");
            // The core system now handles hook registration.
            // You can add any other plugin-specific setup logic here.
            console.log("API Widget plugin post-install setup complete.");
            return true;
        },
        onDelete: async function (db, pluginId) {
            console.log("Running on-delete cleanup for API Widget plugin...");
            // The core system now handles hook un-registration.
            // You can add any other plugin-specific cleanup logic here.
            console.log("API Widget plugin on-delete cleanup complete.");
            return true;
        }
    })
})()