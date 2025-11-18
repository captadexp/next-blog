import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {ClientSDK, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import {PluginStatus, RecentBlog} from "./client/utils/types";
import {StatusOverview} from "./client/components/StatusOverview";
import {ProviderConfig} from "./client/components/ProviderConfig";
import {TopicsManager} from "./client/components/TopicsManager";
import {CustomPrompt} from "./client/components/CustomPrompt";
import {RecentBlogs} from "./client/components/RecentBlogs";
import "./styles.css"

const renderSettingsPanel = (sdk: ClientSDK) => {

    const [status, setStatus] = useState<PluginStatus | null>(null);
    const [recentBlogs, setRecentBlogs] = useState<RecentBlog[]>([]);

    const loadData = async () => {
        const [statusResponse, blogsResponse] = await Promise.all([
            sdk.callRPC('ai-generator:getStatus', {}),
            sdk.callRPC('ai-generator:getRecentBlogs', {})
        ]);

        setStatus(statusResponse as PluginStatus);
        setRecentBlogs((blogsResponse as { blogs: RecentBlog[] }).blogs);
    };

    useEffect(() => {
        loadData();
    }, []);


    if (!status) return <div>Loading...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">AI Blog Generator</h1>

            <StatusOverview status={status}/>
            <ProviderConfig status={status} sdk={sdk} onUpdate={setStatus}/>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <TopicsManager status={status} sdk={sdk} onUpdate={setStatus}/>
                <CustomPrompt status={status} sdk={sdk}/>
            </div>

            <RecentBlogs recentBlogs={recentBlogs} onRefresh={loadData}/>
        </div>
    );
};

export default defineClient({
    hooks: {'system:plugin:settings-panel': renderSettingsPanel as any},
    hasSettingsPanel: true
});