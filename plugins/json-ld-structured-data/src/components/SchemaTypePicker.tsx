export const SCHEMA_TYPES = [
    {value: 'Article', label: 'Article', description: 'Standard article or blog post'},
    {value: 'BlogPosting', label: 'Blog Post', description: 'Blog-specific content'},
    {value: 'NewsArticle', label: 'News Article', description: 'Time-sensitive news content'},
    {value: 'Review', label: 'Review', description: 'Product or service review'},
    {value: 'HowTo', label: 'How-To Guide', description: 'Step-by-step instructions'},
    {value: 'FAQ', label: 'FAQ', description: 'Frequently asked questions'},
    {value: 'Recipe', label: 'Recipe', description: 'Cooking or food recipe'},
    {value: 'Product', label: 'Product', description: 'Product description'},
    {value: 'Event', label: 'Event', description: 'Event information'},
    {value: 'Course', label: 'Course', description: 'Educational course'}
];

interface SchemaTypePickerProps {
    value: string;
    onChange: (value: string) => void;
}

export function SchemaTypePicker({value, onChange}: SchemaTypePickerProps) {
    const selectedType = SCHEMA_TYPES.find(t => t.value === value);

    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Schema Type</label>
            <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {SCHEMA_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                ))}
            </select>
            {selectedType && (
                <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
            )}
        </div>
    );
}