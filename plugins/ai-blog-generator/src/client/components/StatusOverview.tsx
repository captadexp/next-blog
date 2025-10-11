import React from 'react';
import type {PluginStatus} from '../utils/types.js';
import {formatLastGenerated} from '../utils/formatters.js';

interface StatusOverviewProps {
    status: PluginStatus;
}

export function StatusOverview({status}: StatusOverviewProps) {
    return (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Status Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                        <div
                            className={`w-3 h-3 rounded-full mr-2 ${status.hasApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">API Key</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                        {status.hasApiKey ? 'Configured' : 'Missing'}
                    </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{status.blogsCreatedToday}</div>
                    <p className="text-xs text-gray-600">Generated Today</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <div
                        className="text-2xl font-bold text-green-600">{status.dailyLimit - status.blogsCreatedToday}</div>
                    <p className="text-xs text-gray-600">Remaining Today</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium">{formatLastGenerated(status.lastBlogCreated)}</div>
                    <p className="text-xs text-gray-600">Last Generated</p>
                </div>
            </div>

            {!status.hasApiKey && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex">
                        <div className="text-yellow-400">⚠️</div>
                        <div className="ml-3">
                            <h3 className="text-yellow-800 font-medium">{status.aiProvider?.toUpperCase()} API Key
                                Required</h3>
                            <p className="text-yellow-700 mt-1">
                                Please configure your {status.aiProvider?.toUpperCase()} API key in the settings below
                                to enable blog generation.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                    <div className="text-blue-400">ℹ️</div>
                    <div className="ml-3">
                        <h3 className="text-blue-800 font-medium">Draft Creation Notice</h3>
                        <p className="text-blue-700 mt-1">
                            All generated blogs are automatically saved as <strong>drafts</strong> and marked with
                            plugin metadata for easy identification.
                            Review and publish them manually when ready.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}