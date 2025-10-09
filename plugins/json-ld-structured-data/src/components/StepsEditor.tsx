interface Step {
    name?: string;
    text: string;
    image?: string;
}

interface StepsEditorProps {
    steps: Step[];
    onChange: (steps: Step[]) => void;
}

export function StepsEditor({ steps, onChange }: StepsEditorProps) {
    const addStep = () => {
        const newSteps = [...steps, { text: '', name: '' }];
        onChange(newSteps);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        onChange(newSteps);
    };

    const updateStep = (index: number, field: keyof Step, value: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        onChange(newSteps);
    };

    return (
        <div className="w-full">
            <div className="flex justify-between mb-3">
                <span className="text-sm font-medium">Steps</span>
                <button
                    onClick={addStep}
                    className="px-2 py-1 text-xs bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600"
                >
                    + Add Step
                </button>
            </div>

            {steps.map((step, index) => (
                <div
                    key={index.toString()}
                    className="border border-gray-200 rounded p-3 mb-3"
                >
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Step {index + 1}</span>
                        <button
                            onClick={() => removeStep(index)}
                            className="px-1 py-1 text-xs bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mb-2">
                        <label className="block text-xs mb-1">
                            Step Title (Optional)
                        </label>
                        <input
                            type="text"
                            value={step.name || ''}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            placeholder="e.g., Preparation"
                            className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="block text-xs mb-1">
                            Instructions *
                        </label>
                        <textarea
                            value={step.text || ''}
                            onChange={(e) => updateStep(index, 'text', e.target.value)}
                            placeholder="Detailed instructions for this step..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded outline-none resize-y focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                        />
                    </div>
                </div>
            ))}

            {steps.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                    <p className="m-0 text-sm">
                        No steps added yet. Click "Add Step" to get started.
                    </p>
                </div>
            )}
        </div>
    );
}