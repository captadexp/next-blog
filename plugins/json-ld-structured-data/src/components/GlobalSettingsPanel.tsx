import type {GlobalJsonLdSettings} from '../types/plugin-types.js';
import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import styles from './GlobalSettingsPanel.module.css';

interface GlobalSettingsPanelProps {
    sdk: ClientSDK;
    settings: GlobalJsonLdSettings;
    onSettingsChange: (settings: GlobalJsonLdSettings) => void;
    onSave: () => Promise<void>;
    isLoading?: boolean;
    isSaving?: boolean;
}

export function GlobalSettingsPanel({
                                        sdk,
                                        settings,
                                        onSettingsChange,
                                        onSave,
                                        isLoading = false,
                                        isSaving = false
                                    }: GlobalSettingsPanelProps) {
    const updateOrganization = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            organization: {...settings.organization, [field]: value}
        });
    };

    const updateWebsite = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            website: {...settings.website, [field]: value}
        });
    };

    const updateArticle = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            article: {...settings.article, [field]: value}
        });
    };

    const updateSameAs = (index: number, value: string) => {
        const sameAs = [...(settings.organization?.sameAs || [])];
        if (value.trim()) {
            sameAs[index] = value;
        } else {
            sameAs.splice(index, 1);
        }
        updateOrganization('sameAs', sameAs);
    };

    const addSameAsField = () => {
        const sameAs = [...(settings.organization?.sameAs || []), ''];
        updateOrganization('sameAs', sameAs);
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <span className={styles.loadingText}>Loading settings...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>JSON-LD Structured Data Settings</h1>
            <div className={styles.sections}>

                {/* Organization Settings */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🏢</span>
                        <h2 className={styles.sectionTitle}>Organization Information</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        Configure your organization details for schema.org structured data.
                    </p>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label className={styles.label}>Organization Name *</label>
                            <input
                                className={styles.input}
                                type="text"
                                value={settings.organization?.name || ''}
                                onChange={(e) => updateOrganization('name', e.target.value)}
                                placeholder="Your Organization Name"
                            />
                            <p className={styles.helpText}>The official name of your organization</p>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Organization URL *</label>
                            <input
                                className={styles.input}
                                type="url"
                                value={settings.organization?.url || ''}
                                onChange={(e) => updateOrganization('url', e.target.value)}
                                placeholder="https://yourorganization.com"
                            />
                            <p className={styles.helpText}>Your organization's main website URL</p>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Logo URL</label>
                            <input
                                className={styles.input}
                                type="url"
                                value={settings.organization?.logo || ''}
                                onChange={(e) => updateOrganization('logo', e.target.value)}
                                placeholder="https://yourorganization.com/logo.png"
                            />
                            <p className={styles.helpText}>URL to your organization's logo (recommended: 600x60px)</p>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Contact Email</label>
                            <input
                                className={styles.input}
                                type="email"
                                value={settings.organization?.email || ''}
                                onChange={(e) => updateOrganization('email', e.target.value)}
                                placeholder="contact@yourorganization.com"
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            className={styles.textarea}
                            value={settings.organization?.description || ''}
                            onChange={(e) => updateOrganization('description', e.target.value)}
                            placeholder="Brief description of your organization..."
                            rows={3}
                        />
                    </div>

                    {/* Social Media Links */}
                    <div>
                        <div className={styles.sameAsHeader}>
                            <h3>Social Media & Same As Links</h3>
                            <button className={styles.button} onClick={addSameAsField}>
                                Add Link
                            </button>
                        </div>
                        <p className={styles.sectionDescription}>
                            Add links to your organization's social media profiles and other official web properties.
                        </p>
                        <div className={styles.sameAsGrid}>
                            {(settings.organization?.sameAs || ['']).map((link, index) => (
                                <div key={index.toString()} className={styles.sameAsRow}>
                                    <input
                                        className={styles.sameAsInput}
                                        type="url"
                                        value={link}
                                        onChange={(e) => updateSameAs(index, e.target.value)}
                                        placeholder="https://twitter.com/yourorganization"
                                    />
                                    {index > 0 && (
                                        <button
                                            className={styles.buttonSecondary}
                                            onClick={() => updateSameAs(index, '')}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Website Settings */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🌐</span>
                        <h2 className={styles.sectionTitle}>Website Information</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        Configure your website details for enhanced search engine understanding.
                    </p>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label className={styles.label}>Website Name</label>
                            <input
                                className={styles.input}
                                type="text"
                                value={settings.website?.name || ''}
                                onChange={(e) => updateWebsite('name', e.target.value)}
                                placeholder="Your Website Name"
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Website URL</label>
                            <input
                                className={styles.input}
                                type="url"
                                value={settings.website?.url || ''}
                                onChange={(e) => updateWebsite('url', e.target.value)}
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Website Description</label>
                        <textarea
                            className={styles.textarea}
                            value={settings.website?.description || ''}
                            onChange={(e) => updateWebsite('description', e.target.value)}
                            placeholder="Brief description of your website..."
                            rows={3}
                        />
                    </div>

                    {/* Search Action */}
                    <div>
                        <div className={styles.checkboxGroup}>
                            <input
                                className={styles.checkbox}
                                type="checkbox"
                                id="searchAction"
                                checked={settings.website?.searchAction?.enabled || false}
                                onChange={(e) => updateWebsite('searchAction', {
                                    ...settings.website?.searchAction,
                                    enabled: e.target.checked
                                })}
                            />
                            <label className={styles.label}>Enable Site Search Schema</label>
                        </div>
                        {settings.website?.searchAction?.enabled && (
                            <div className={styles.field}>
                                <label className={styles.label}>Search URL Template</label>
                                <input
                                    className={styles.input}
                                    type="url"
                                    value={settings.website?.searchAction?.urlTemplate || ''}
                                    onChange={(e) => updateWebsite('searchAction', {
                                        ...settings.website?.searchAction,
                                        urlTemplate: e.target.value
                                    })}
                                    placeholder="https://yoursite.com/search?q={search_term_string}"
                                />
                                <p className={styles.helpText}>
                                    Use {'{search_term_string}'} as placeholder for search queries
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Article Defaults */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>📝</span>
                        <h2 className={styles.sectionTitle}>Article Defaults</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        Set default values for article structured data.
                    </p>

                    <div className={styles.checkboxGroup}>
                        <input
                            className={styles.checkbox}
                            type="checkbox"
                            id="useOrgAsPublisher"
                            checked={settings.article?.defaultPublisher || false}
                            onChange={(e) => updateArticle('defaultPublisher', e.target.checked)}
                        />
                        <label className={styles.label}>
                            Use organization as default publisher for articles
                        </label>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Default Image Policy</label>
                        <select
                            className={styles.select}
                            value={settings.article?.defaultImagePolicy || 'featured'}
                            onChange={(e) => updateArticle('defaultImagePolicy', e.target.value)}
                        >
                            <option value="featured">Use featured image</option>
                            <option value="first">Use first image in content</option>
                            <option value="none">Don't include images by default</option>
                        </select>
                        <p className={styles.helpText}>
                            How to handle images in article structured data by default
                        </p>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Default Language</label>
                        <select
                            className={styles.select}
                            value={settings.defaultLanguage || 'en-US'}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                defaultLanguage: e.target.value
                            })}
                        >
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="fr-FR">French</option>
                            <option value="de-DE">German</option>
                            <option value="it-IT">Italian</option>
                            <option value="pt-BR">Portuguese (Brazil)</option>
                            <option value="zh-CN">Chinese (Simplified)</option>
                            <option value="ja-JP">Japanese</option>
                            <option value="ko-KR">Korean</option>
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <div className={styles.saveButtonContainer}>
                    <button
                        className={styles.saveButton}
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving && <div className={styles.spinner}></div>}
                        <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}