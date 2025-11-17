interface AdvancedFieldsProps {
    overrides: any;
    config: any;
    onFieldChange: (field: string, value: any) => void;
}

export function AdvancedFields({overrides, config, onFieldChange}: AdvancedFieldsProps) {
    return (
        <>
            {/* Language */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Language Override</label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder={config.language || 'en-US'}
                    value={overrides.language || ''}
                    onChange={e => onFieldChange('language', e.target.value)}
                />
            </div>

            {/* Keywords */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Additional Keywords</label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder="Comma-separated keywords"
                    value={overrides.keywords || ''}
                    onChange={e => onFieldChange('keywords', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">These will be added to tags from the blog</p>
            </div>

            {/* Custom JSON-LD */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Properties (JSON)</label>
                <textarea
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-24 font-mono text-xs resize-none"
                    placeholder='{"customProperty": "value"}'
                    value={overrides.customJson || ''}
                    onChange={e => onFieldChange('customJson', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Advanced: Add custom JSON-LD properties</p>
            </div>

            {/* Publisher Override */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        checked={overrides.useCustomPublisher || false}
                        onChange={e => onFieldChange('useCustomPublisher', e.target.checked)}
                    />
                    <span className="font-medium text-gray-700">Use custom publisher</span>
                </label>
                {overrides.useCustomPublisher && (
                    <div className="pl-5 space-y-2">
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Publisher name"
                            value={overrides.publisherName || ''}
                            onChange={e => onFieldChange('publisherName', e.target.value)}
                        />
                        <input
                            type="url"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Publisher URL"
                            value={overrides.publisherUrl || ''}
                            onChange={e => onFieldChange('publisherUrl', e.target.value)}
                        />
                        <input
                            type="url"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Publisher logo URL"
                            value={overrides.publisherLogo || ''}
                            onChange={e => onFieldChange('publisherLogo', e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Breadcrumb */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        checked={overrides.includeBreadcrumb || false}
                        onChange={e => onFieldChange('includeBreadcrumb', e.target.checked)}
                    />
                    <span className="font-medium text-gray-700">Include breadcrumb list</span>
                </label>
                {overrides.includeBreadcrumb && (
                    <p className="text-xs text-gray-500 pl-5">
                        Will generate breadcrumb based on categories
                    </p>
                )}
            </div>

            {/* Main Entity */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        checked={overrides.isPartOfWebsite || false}
                        onChange={e => onFieldChange('isPartOfWebsite', e.target.checked)}
                    />
                    <span className="font-medium text-gray-700">Mark as part of website</span>
                </label>
                {overrides.isPartOfWebsite && (
                    <p className="text-xs text-gray-500 pl-5">
                        Links this content to the main website entity
                    </p>
                )}
            </div>
        </>
    );
}