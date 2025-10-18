import type {BlogEditorContext} from '@supergrowthai/plugin-dev-kit/client';

const AUTHOR_TYPES = [
    {value: 'Person', label: 'Person'},
    {value: 'Organization', label: 'Organization'}
];

interface BasicFieldsProps {
    overrides: any;
    config: any;
    context: BlogEditorContext;
    onFieldChange: (field: string, value: any) => void;
    onNestedFieldChange: (path: string, value: any) => void;
    onSelectImage: (field: string) => void;
    onAddImage: () => void;
    onRemoveImage: (index: number) => void;
}

export function BasicFields({
                                overrides,
                                config,
                                context,
                                onFieldChange,
                                onNestedFieldChange,
                                onSelectImage,
                                onAddImage,
                                onRemoveImage
                            }: BasicFieldsProps) {
    return (
        <>
            {/* Headline */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Headline
                    {!overrides.headline && context?.form?.data?.title && (
                        <span className="text-gray-400 ml-1">(using: {context.form.data.title})</span>
                    )}
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder={context?.form?.data?.title || context?.data?.title || 'Custom headline'}
                    value={overrides.headline || ''}
                    onChange={e => onFieldChange('headline', e.target.value)}
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                    {!overrides.description && context?.form?.data?.excerpt && (
                        <span className="text-gray-400 ml-1">(using excerpt)</span>
                    )}
                </label>
                <textarea
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-16 resize-none focus:ring-1 focus:ring-blue-500"
                    placeholder={context?.form?.data?.excerpt || context?.data?.excerpt || 'Custom description'}
                    value={overrides.description || ''}
                    onChange={e => onFieldChange('description', e.target.value)}
                />
                {!overrides.description && !context?.form?.data?.excerpt && !context?.data?.excerpt && (
                    <p className="text-xs text-gray-500 mt-1">Tip: Add an excerpt to your blog post for better SEO</p>
                )}
            </div>

            {/* Featured Image Override */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Featured Image Override</label>
                <div className="space-y-2">
                    {overrides.featuredImageMedia ? (
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex flex-col items-center space-y-1">
                                {overrides.featuredImageMedia.url && (
                                    <img
                                        src={overrides.featuredImageMedia.url}
                                        alt={overrides.featuredImageMedia.alt || 'Featured'}
                                        className="w-16 h-16 object-cover rounded border border-gray-300"
                                    />
                                )}
                                <input
                                    type="text"
                                    className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Alt text"
                                    value={overrides.featuredImageMedia.alt || ''}
                                    onChange={e => {
                                        const updated = {...overrides.featuredImageMedia, alt: e.target.value};
                                        onFieldChange('featuredImageMedia', updated);
                                    }}
                                />
                                <button
                                    className="text-[10px] text-red-600 hover:text-red-700"
                                    onClick={() => onFieldChange('featuredImageMedia', null)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => onSelectImage('featuredImage')}
                        >
                            Select Featured Image
                        </button>
                    )}
                </div>
            </div>

            {/* Author */}
            <div className="space-y-2 p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Author Information</label>
                    <label className="flex items-center gap-1 text-xs">
                        <input
                            type="checkbox"
                            checked={overrides.hideAuthor || false}
                            onChange={e => onFieldChange('hideAuthor', e.target.checked)}
                        />
                        Hide author
                    </label>
                </div>
                {!overrides.hideAuthor && (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Type</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    value={overrides.authorType || config.article?.authorType || 'Person'}
                                    onChange={e => onFieldChange('authorType', e.target.value)}
                                >
                                    {AUTHOR_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder={"Author name"}
                                    value={overrides.authorName || ''}
                                    onChange={e => onFieldChange('authorName', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">URL</label>
                            <input
                                type="url"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Author profile URL"
                                value={overrides.authorUrl || ''}
                                onChange={e => onFieldChange('authorUrl', e.target.value)}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Additional Images */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Additional Images</label>
                <div className="space-y-2">
                    {(overrides.imagesMedia || []).map((img: any, i: number) => (
                        <div key={`img-${i}`} className="inline-block">
                            {img.url ? (
                                <div className="p-1.5 bg-gray-50 rounded border border-gray-200 inline-block">
                                    <div className="flex flex-col items-center space-y-1">
                                        <img
                                            src={img.url}
                                            alt={img.alt || ''}
                                            className="w-12 h-12 object-cover rounded border border-gray-300"
                                        />
                                        <input
                                            type="text"
                                            className="w-20 text-[9px] border border-gray-300 rounded px-1 py-0.5"
                                            placeholder="Alt text"
                                            value={img.alt || ''}
                                            onChange={e => {
                                                const images = [...(overrides.imagesMedia || [])];
                                                images[i] = {...images[i], alt: e.target.value};
                                                onFieldChange('imagesMedia', images);
                                            }}
                                        />
                                        <button
                                            className="text-[9px] text-red-600 hover:text-red-700"
                                            onClick={() => onRemoveImage(i)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="p-2 text-[10px] border border-gray-300 rounded hover:bg-gray-50 inline-block"
                                    onClick={() => onSelectImage(`images.${i}`)}
                                >
                                    + Select
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={onAddImage}
                    >
                        + Add image
                    </button>
                </div>
            </div>
        </>
    );
}