(() => {

    const pluginState = {
        latestSdk: null,
        cachedData: null
    };

    function dashboardWidget(sdk, prev, context) {
        pluginState.latestSdk = sdk;

        const fetchData = async () => {
            const sdk = pluginState.latestSdk;


            pluginState.cachedData = {title: "Loading..."};
            sdk.refresh(); // Refresh immediately to show "Loading..."

            try {
                const response = await sdk.apis.getBlogs();
                if (response.code === 0 && response.payload.length > 0) {
                    sdk.notify("Latest blog loaded");
                    pluginState.cachedData = response.payload.at(-1);
                } else {
                    pluginState.cachedData = {title: "Could not fetch latest blog."};
                }
            } catch (err) {
                console.log(err);
                pluginState.cachedData = {title: `Error: ${err.message}`};
            }

            // After the API call is done, refresh again with the final data.
            sdk.refresh();
        };

        // If we have no data yet, trigger the initial fetch.
        if (pluginState.cachedData === null) {
            // Use a setTimeout to avoid an infinite loop if the API fails instantly.
            setTimeout(() => fetchData(), 0);
            return ['p', {}, 'Initializing widget...'];
        }

        // Render the UI based on the current `cachedData`.
        return [
            'div', {class: 'p-4 border border-gray-100 rounded my-2'},
            ['h3', {class: 'font-bold'}, 'Latest Blog Post'],
            ['p', {}, pluginState.cachedData.title],
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

    return {
        hooks: {"dashboard-widget": dashboardWidget}
    };
})()
