import styles from './StepsEditor.module.css';

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
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.label}>Steps</span>
                <button
                    onClick={addStep}
                    className={styles.addButton}
                >
                    + Add Step
                </button>
            </div>

            {steps.map((step, index) => (
                <div
                    key={index.toString()}
                    className={styles.step}
                >
                    <div className={styles.stepHeader}>
                        <span className={styles.stepTitle}>Step {index + 1}</span>
                        <button
                            onClick={() => removeStep(index)}
                            className={styles.removeButton}
                        >
                            ✕
                        </button>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            Step Title (Optional)
                        </label>
                        <input
                            type="text"
                            value={step.name || ''}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            placeholder="e.g., Preparation"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            Instructions *
                        </label>
                        <textarea
                            value={step.text || ''}
                            onChange={(e) => updateStep(index, 'text', e.target.value)}
                            placeholder="Detailed instructions for this step..."
                            rows={3}
                            className={styles.textarea}
                        />
                    </div>
                </div>
            ))}

            {steps.length === 0 && (
                <div className={styles.emptyState}>
                    <p className={styles.emptyStateText}>
                        No steps added yet. Click "Add Step" to get started.
                    </p>
                </div>
            )}
        </div>
    );
}