import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useState} from '@supergrowthai/plugin-dev-kit/client';
import type {PluginStatus} from '../utils/types.js';
import {addTopic, removeTopic} from '../utils/actions.js';

interface TopicsManagerProps {
    status: PluginStatus;
    sdk: ClientSDK;
    onUpdate: (status: PluginStatus) => void;
}

export function TopicsManager({status, sdk, onUpdate}: TopicsManagerProps) {
    const [newTopic, setNewTopic] = useState('');
    const [updating, setUpdating] = useState(false);

    const addTopicHandler = async () => {
        if (!newTopic.trim()) return;
        setUpdating(true);
        try {
            const updatedStatus = await addTopic(sdk, newTopic);
            onUpdate(updatedStatus);
            setNewTopic('');
        } catch (error) {
            console.error('Failed to add topic:', error);
        } finally {
            setUpdating(false);
        }
    };

    const removeTopicHandler = async (index: number) => {
        setUpdating(true);
        try {
            const updatedStatus = await removeTopic(sdk, index);
            onUpdate(updatedStatus);
        } catch (error) {
            console.error('Failed to remove topic:', error);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Blog Topics</label>

            {/* Add New Topic */}
            <div className="flex items-center space-x-2 mb-3">
                <input
                    type="text"
                    placeholder="Enter a new topic..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            addTopicHandler();
                        }
                    }}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <button
                    onClick={addTopicHandler}
                    disabled={updating || !newTopic.trim()}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add Topic
                </button>
            </div>

            {/* Topics List */}
            <div className="space-y-2">
                {status.topics.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No topics configured. Add some topics to start
                        generating blogs.</p>
                ) : (
                    status.topics.map((topic, index) => (
                        <div key={`topic-${index}`}
                             className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm">{topic}</span>
                            <button
                                onClick={() => removeTopicHandler(index)}
                                disabled={updating}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                title="Remove topic"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            <p className="text-xs text-gray-600 mt-2">
                Topics are selected randomly for blog generation. Add diverse topics for better content variety.
            </p>
        </div>
    );
}