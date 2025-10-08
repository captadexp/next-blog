import type {GlobalJsonLdSettings} from '../types/plugin-types.js';
import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';

// Add keyframe animation for spinner
if (typeof document !== 'undefined' && !document.getElementById('global-settings-styles')) {
    const style = document.createElement('style');
    style.id = 'global-settings-styles';
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

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
            organization: {
                ...settings.organization,
                [field]: value
            }
        });
    };

    const updateWebsite = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            website: {
                ...settings.website,
                [field]: value
            }
        });
    };

    const updateArticle = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            article: {
                ...settings.article,
                [field]: value
            }
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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    width: '2rem',
                    height: '2rem',
                    border: '4px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{
                    marginLeft: '0.75rem',
                    color: '#4b5563'
                }}>Loading settings...</span>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1.5rem'
        }}>
            <h1 style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem'
            }}>JSON-LD Structured Data Settings</h1>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem'
            }}>
                {/* Organization Settings */}
                <div style={{
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <span style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem'
                        }}>🏢</span>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}>Organization Information</h2>
                    </div>
                    <p style={{
                        color: '#4b5563',
                        marginBottom: '1.5rem'
                    }}>
                        Configure your organization details for schema.org structured data. This information will be
                        used as the default publisher for all content.
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Organization Name *
                            </label>
                            <input
                                type="text"
                                value={settings.organization?.name || ''}
                                onChange={(e) => updateOrganization('name', e.target.value)}
                                placeholder="Your Organization Name"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>The official name of your organization</p>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Organization URL *
                            </label>
                            <input
                                type="url"
                                value={settings.organization?.url || ''}
                                onChange={(e) => updateOrganization('url', e.target.value)}
                                placeholder="https://yourorganization.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>Your organization's main website URL</p>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Logo URL
                            </label>
                            <input
                                type="url"
                                value={settings.organization?.logo || ''}
                                onChange={(e) => updateOrganization('logo', e.target.value)}
                                placeholder="https://yourorganization.com/logo.png"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>URL to your organization's logo (recommended:
                                600x60px)</p>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Contact Email
                            </label>
                            <input
                                type="email"
                                value={settings.organization?.email || ''}
                                onChange={(e) => updateOrganization('email', e.target.value)}
                                placeholder="contact@yourorganization.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={settings.organization?.telephone || ''}
                                onChange={(e) => updateOrganization('telephone', e.target.value)}
                                placeholder="+1-555-123-4567"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    <div style={{marginTop: '1.5rem'}}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem'
                        }}>
                            Description
                        </label>
                        <textarea
                            value={settings.organization?.description || ''}
                            onChange={(e) => updateOrganization('description', e.target.value)}
                            placeholder="Brief description of your organization..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Social Media Links */}
                    <div style={{marginTop: '1.5rem'}}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem'
                        }}>
                            <h3 style={{
                                fontSize: '1.125rem',
                                fontWeight: '500'
                            }}>Social Media & Same As Links</h3>
                            <button
                                onClick={addSameAsField}
                                style={{
                                    paddingLeft: '0.75rem',
                                    paddingRight: '0.75rem',
                                    paddingTop: '0.25rem',
                                    paddingBottom: '0.25rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    borderRadius: '0.25rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                            >
                                Add Link
                            </button>
                        </div>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#4b5563',
                            marginBottom: '1rem'
                        }}>
                            Add links to your organization's social media profiles, Wikipedia page, and other official
                            web properties.
                        </p>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            {(settings.organization?.sameAs || ['']).map((link, index) => (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={(e) => updateSameAs(index, e.target.value)}
                                        placeholder="https://twitter.com/yourorganization"
                                        style={{
                                            flex: '1',
                                            padding: '0.75rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.5rem',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    {index > 0 && (
                                        <button
                                            onClick={() => updateSameAs(index, '')}
                                            style={{
                                                padding: '0.5rem',
                                                color: '#ef4444',
                                                borderRadius: '0.25rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                <div style={{
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <span style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem'
                        }}>🌐</span>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}>Website Information</h2>
                    </div>
                    <p style={{
                        color: '#4b5563',
                        marginBottom: '1.5rem'
                    }}>
                        Configure your website details for enhanced search engine understanding.
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Website Name
                            </label>
                            <input
                                type="text"
                                value={settings.website?.name || ''}
                                onChange={(e) => updateWebsite('name', e.target.value)}
                                placeholder="Your Website Name"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Website URL
                            </label>
                            <input
                                type="url"
                                value={settings.website?.url || ''}
                                onChange={(e) => updateWebsite('url', e.target.value)}
                                placeholder="https://yourwebsite.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    <div style={{marginTop: '1.5rem'}}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem'
                        }}>
                            Website Description
                        </label>
                        <textarea
                            value={settings.website?.description || ''}
                            onChange={(e) => updateWebsite('description', e.target.value)}
                            placeholder="Brief description of your website..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Search Action */}
                    <div style={{marginTop: '1.5rem'}}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <input
                                type="checkbox"
                                id="searchAction"
                                checked={settings.website?.searchAction?.enabled || false}
                                onChange={(e) => updateWebsite('searchAction', {
                                    ...settings.website?.searchAction,
                                    enabled: e.target.checked
                                })}
                                style={{
                                    width: '1rem',
                                    height: '1rem',
                                    accentColor: '#2563eb'
                                }}
                            />
                            <label style={{
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}>
                                Enable Site Search Schema
                            </label>
                        </div>
                        {settings.website?.searchAction?.enabled && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem'
                                }}>
                                    Search URL Template
                                </label>
                                <input
                                    type="url"
                                    value={settings.website?.searchAction?.urlTemplate || ''}
                                    onChange={(e) => updateWebsite('searchAction', {
                                        ...settings.website?.searchAction,
                                        urlTemplate: e.target.value
                                    })}
                                    placeholder="https://yoursite.com/search?q={search_term_string}"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#3b82f6';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#d1d5db';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    marginTop: '0.25rem'
                                }}>
                                    Use {'{search_term_string}'} as placeholder for search queries
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Article Defaults */}
                <div style={{
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <span style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem'
                        }}>📝</span>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}>Article Defaults</h2>
                    </div>
                    <p style={{
                        color: '#4b5563',
                        marginBottom: '1.5rem'
                    }}>
                        Set default values for article structured data that will be used when creating new content.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginBottom: '1rem'
                            }}>
                                <input
                                    type="checkbox"
                                    id="useOrgAsPublisher"
                                    checked={settings.article?.defaultPublisher || false}
                                    onChange={(e) => updateArticle('defaultPublisher', e.target.checked)}
                                    style={{
                                        width: '1rem',
                                        height: '1rem',
                                        accentColor: '#2563eb'
                                    }}
                                />
                                <label style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}>
                                    Use organization as default publisher for articles
                                </label>
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Default Image Policy
                            </label>
                            <select
                                value={settings.article?.defaultImagePolicy || 'featured'}
                                onChange={(e) => updateArticle('defaultImagePolicy', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                <option value="featured">Use featured image</option>
                                <option value="first">Use first image in content</option>
                                <option value="none">Don't include images by default</option>
                            </select>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>
                                How to handle images in article structured data by default
                            </p>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem'
                            }}>
                                Default Language
                            </label>
                            <select
                                value={settings.defaultLanguage || 'en-US'}
                                onChange={(e) => onSettingsChange({
                                    ...settings,
                                    defaultLanguage: e.target.value
                                })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
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
                </div>

                {/* Save Button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        style={{
                            paddingLeft: '1.5rem',
                            paddingRight: '1.5rem',
                            paddingTop: '0.75rem',
                            paddingBottom: '0.75rem',
                            backgroundColor: isSaving ? '#94a3b8' : '#3b82f6',
                            color: 'white',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSaving) e.target.style.backgroundColor = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                            if (!isSaving) e.target.style.backgroundColor = '#3b82f6';
                        }}
                    >
                        {isSaving && <div style={{
                            width: '1rem',
                            height: '1rem',
                            border: '2px solid white',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>}
                        <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}