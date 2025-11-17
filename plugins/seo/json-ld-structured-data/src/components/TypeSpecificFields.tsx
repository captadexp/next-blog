interface TypeSpecificFieldsProps {
    schemaType: string;
    overrides: any;
    onNestedFieldChange: (path: string, value: any) => void;
    onSelectImage: (field: string) => void;
}

export function TypeSpecificFields({
                                       schemaType,
                                       overrides,
                                       onNestedFieldChange,
                                       onSelectImage
                                   }: TypeSpecificFieldsProps) {

    if (schemaType === 'Review') {
        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">Review Details</h4>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Item Being Reviewed</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Product or service name"
                        value={overrides.review?.itemName || ''}
                        onChange={e => onNestedFieldChange('review.itemName', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Item Type</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="e.g., Product, Movie, Book"
                        value={overrides.review?.itemType || ''}
                        onChange={e => onNestedFieldChange('review.itemType', e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Rating</label>
                        <input
                            type="number"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="4.5"
                            step="0.1"
                            min="0"
                            max="5"
                            value={overrides.review?.rating?.value || ''}
                            onChange={e => onNestedFieldChange('review.rating.value', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Best Rating</label>
                        <input
                            type="number"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="5"
                            value={overrides.review?.rating?.best || '5'}
                            onChange={e => onNestedFieldChange('review.rating.best', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Worst Rating</label>
                        <input
                            type="number"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="1"
                            value={overrides.review?.rating?.worst || '1'}
                            onChange={e => onNestedFieldChange('review.rating.worst', e.target.value)}
                        />
                    </div>
                </div>
                {/* Review Image */}
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Item Image</label>
                    {overrides.review?.imageMedia ? (
                        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded border border-gray-200">
                            <img
                                src={overrides.review.imageMedia.url}
                                alt={overrides.review.imageMedia.alt || 'Item'}
                                className="w-6 h-6 object-cover rounded border border-gray-300"
                            />
                            <div className="flex-1 text-xs">
                                <p className="font-medium text-gray-700 truncate">{overrides.review.imageMedia.alt || 'No alt text'}</p>
                            </div>
                            <button
                                className="px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 rounded"
                                onClick={() => onNestedFieldChange('review.imageMedia', null)}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <button
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => onSelectImage('review.imageMedia')}
                        >
                            Select Item Image
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (schemaType === 'HowTo') {
        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">How-To Details</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Total Time</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="PT30M"
                            value={overrides.howTo?.totalTime || ''}
                            onChange={e => onNestedFieldChange('howTo.totalTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Estimated Cost</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="$50-$100"
                            value={overrides.howTo?.estimatedCost || ''}
                            onChange={e => onNestedFieldChange('howTo.estimatedCost', e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Steps</label>
                    <div className="space-y-2">
                        {(overrides.howTo?.steps || []).map((step: any, i: number) => (
                            <div key={`step-${i}`} className="p-2 bg-gray-50 rounded space-y-1">
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder="Step name"
                                    value={step.name || ''}
                                    onChange={e => {
                                        const steps = [...(overrides.howTo?.steps || [])];
                                        steps[i] = {...steps[i], name: e.target.value};
                                        onNestedFieldChange('howTo.steps', steps);
                                    }}
                                />
                                <textarea
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-12 resize-none"
                                    placeholder="Step description"
                                    value={step.text || ''}
                                    onChange={e => {
                                        const steps = [...(overrides.howTo?.steps || [])];
                                        steps[i] = {...steps[i], text: e.target.value};
                                        onNestedFieldChange('howTo.steps', steps);
                                    }}
                                />
                                {step.imageMedia ? (
                                    <div
                                        className="flex items-center gap-1.5 p-1 bg-white rounded border border-gray-200">
                                        <img
                                            src={step.imageMedia.url}
                                            alt={step.imageMedia.alt || ''}
                                            className="w-5 h-5 object-cover rounded border border-gray-300"
                                        />
                                        <span
                                            className="flex-1 text-[10px] truncate">{step.imageMedia.alt || 'Step image'}</span>
                                        <button
                                            className="text-[10px] text-red-600 px-1"
                                            onClick={() => {
                                                const steps = [...(overrides.howTo?.steps || [])];
                                                steps[i] = {...steps[i], imageMedia: null};
                                                onNestedFieldChange('howTo.steps', steps);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className="text-xs text-blue-600"
                                        onClick={() => onSelectImage(`howTo.steps.${i}.imageMedia`)}
                                    >
                                        + Add step image
                                    </button>
                                )}
                                <button
                                    className="text-xs text-red-600 hover:text-red-700"
                                    onClick={() => {
                                        const steps = (overrides.howTo?.steps || []).filter((_: any, idx: number) => idx !== i);
                                        onNestedFieldChange('howTo.steps', steps);
                                    }}
                                >
                                    Remove step
                                </button>
                            </div>
                        ))}
                        <button
                            className="text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => {
                                const steps = [...(overrides.howTo?.steps || []), {name: '', text: ''}];
                                onNestedFieldChange('howTo.steps', steps);
                            }}
                        >
                            + Add step
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tools Required</label>
                    <textarea
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-12 resize-none"
                        placeholder="One tool per line"
                        value={(overrides.howTo?.tools || []).join('\n')}
                        onChange={e => onNestedFieldChange('howTo.tools', e.target.value.split('\n').filter(Boolean))}
                    />
                </div>
            </div>
        );
    }

    if (schemaType === 'FAQ') {
        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">FAQ Items</h4>
                <div className="space-y-2">
                    {(overrides.faq?.questions || []).map((item: any, i: number) => (
                        <div key={`faq-${i}`} className="p-2 bg-gray-50 rounded space-y-1">
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Question"
                                value={item.question || ''}
                                onChange={e => {
                                    const questions = [...(overrides.faq?.questions || [])];
                                    questions[i] = {...questions[i], question: e.target.value};
                                    onNestedFieldChange('faq.questions', questions);
                                }}
                            />
                            <textarea
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-16 resize-none"
                                placeholder="Answer"
                                value={item.answer || ''}
                                onChange={e => {
                                    const questions = [...(overrides.faq?.questions || [])];
                                    questions[i] = {...questions[i], answer: e.target.value};
                                    onNestedFieldChange('faq.questions', questions);
                                }}
                            />
                            <button
                                className="text-xs text-red-600 hover:text-red-700"
                                onClick={() => {
                                    const questions = (overrides.faq?.questions || []).filter((_: any, idx: number) => idx !== i);
                                    onNestedFieldChange('faq.questions', questions);
                                }}
                            >
                                Remove Q&A
                            </button>
                        </div>
                    ))}
                    <button
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => {
                            const questions = [...(overrides.faq?.questions || []), {question: '', answer: ''}];
                            onNestedFieldChange('faq.questions', questions);
                        }}
                    >
                        + Add Q&A
                    </button>
                </div>
            </div>
        );
    }

    if (schemaType === 'Recipe') {
        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">Recipe Details</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Prep Time</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="PT15M"
                            value={overrides.recipe?.prepTime || ''}
                            onChange={e => onNestedFieldChange('recipe.prepTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Cook Time</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="PT30M"
                            value={overrides.recipe?.cookTime || ''}
                            onChange={e => onNestedFieldChange('recipe.cookTime', e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Yield</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="4 servings"
                            value={overrides.recipe?.recipeYield || ''}
                            onChange={e => onNestedFieldChange('recipe.recipeYield', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Category</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Dessert"
                            value={overrides.recipe?.recipeCategory || ''}
                            onChange={e => onNestedFieldChange('recipe.recipeCategory', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Ingredients</label>
                    <textarea
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm h-20 resize-none"
                        placeholder="One ingredient per line"
                        value={(overrides.recipe?.recipeIngredient || []).join('\n')}
                        onChange={e => onNestedFieldChange('recipe.recipeIngredient', e.target.value.split('\n').filter(Boolean))}
                    />
                </div>
                {/* Recipe Image */}
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Recipe Image</label>
                    {overrides.recipe?.imageMedia ? (
                        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded border border-gray-200">
                            <img
                                src={overrides.recipe.imageMedia.url}
                                alt={overrides.recipe.imageMedia.alt || 'Recipe'}
                                className="w-6 h-6 object-cover rounded border border-gray-300"
                            />
                            <div className="flex-1 text-xs">
                                <p className="font-medium text-gray-700 truncate">{overrides.recipe.imageMedia.alt || 'No alt text'}</p>
                            </div>
                            <button
                                className="px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 rounded"
                                onClick={() => onNestedFieldChange('recipe.imageMedia', null)}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <button
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => onSelectImage('recipe.imageMedia')}
                        >
                            Select Recipe Image
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No type-specific fields for {schemaType}</p>
            <p className="text-xs mt-1">Basic fields will be used</p>
        </div>
    );
}