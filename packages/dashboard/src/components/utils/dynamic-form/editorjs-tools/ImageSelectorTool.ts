import {BlockTool, BlockToolConstructorOptions} from "@editorjs/editorjs/types/tools/block-tool";
import {BlockToolData} from "@editorjs/editorjs/types/tools/block-tool-data";

interface ImageSelectorToolData extends BlockToolData<{}> {
    mediaId?: string;
    src?: string;
    alt?: string;
}

interface ImageSelectorToolConfig {
    placeholder?: string;
}

class ImageSelectorTool implements BlockTool {
    private wrapper: HTMLElement | null = null;
    private data: ImageSelectorToolData;
    private config: ImageSelectorToolConfig;
    private readonly readOnly: boolean;

    constructor({data, readOnly, config}: BlockToolConstructorOptions<ImageSelectorToolData, ImageSelectorToolConfig>) {
        this.readOnly = readOnly;
        this.data = data || {};
        this.config = config || {};
    }

    static get toolbox() {
        return {
            title: 'Image',
            icon: '<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
        };
    }

    static get isReadOnlySupported() {
        return true;
    }

    static get sanitize() {
        return {
            src: {},
            alt: {},
            mediaId: {}
        };
    }

    render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('image-selector-wrapper');

        if (this.data.src) {
            this._createImage(this.data.src, this.data.alt);
        } else {
            this._createPlaceholder();
        }

        return this.wrapper;
    }

    _createImage(url: string, caption?: string) {
        if (!this.wrapper) return;

        this.wrapper.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add('image-container');
        container.style.marginBottom = '10px';

        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.borderRadius = '8px';

        container.appendChild(img);

        if (!this.readOnly) {
            const captionInput = document.createElement('input');
            captionInput.type = 'text';
            captionInput.placeholder = 'Enter image caption...';
            captionInput.value = caption || '';
            captionInput.classList.add('caption-input');
            captionInput.style.width = '100%';
            captionInput.style.marginTop = '8px';
            captionInput.style.padding = '8px';
            captionInput.style.border = '1px solid #e2e8f0';
            captionInput.style.borderRadius = '4px';
            captionInput.style.fontSize = '14px';

            captionInput.addEventListener('input', (e) => {
                this.data.alt = (e.target as HTMLInputElement).value;
                this._notifyChange();
            });

            container.appendChild(captionInput);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '8px';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '8px';

            const changeButton = document.createElement('button');
            changeButton.textContent = 'Change Image';
            changeButton.style.padding = '8px 16px';
            changeButton.style.backgroundColor = '#3182ce';
            changeButton.style.color = 'white';
            changeButton.style.border = 'none';
            changeButton.style.borderRadius = '4px';
            changeButton.style.cursor = 'pointer';
            changeButton.style.fontSize = '14px';

            changeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this._openImageSelector();
            });

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.style.padding = '8px 16px';
            removeButton.style.backgroundColor = '#e53e3e';
            removeButton.style.color = 'white';
            removeButton.style.border = 'none';
            removeButton.style.borderRadius = '4px';
            removeButton.style.cursor = 'pointer';
            removeButton.style.fontSize = '14px';

            removeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.data = {};
                this._createPlaceholder();
                this._notifyChange();
            });

            buttonContainer.appendChild(changeButton);
            buttonContainer.appendChild(removeButton);
            container.appendChild(buttonContainer);
        }

        this.wrapper.appendChild(container);
    }

    _createPlaceholder() {
        if (!this.wrapper) return;

        this.wrapper.innerHTML = '';

        const placeholder = document.createElement('div');
        placeholder.style.padding = '40px';
        placeholder.style.textAlign = 'center';
        placeholder.style.backgroundColor = '#f7fafc';
        placeholder.style.border = '2px dashed #cbd5e0';
        placeholder.style.borderRadius = '8px';
        placeholder.style.cursor = this.readOnly ? 'default' : 'pointer';
        placeholder.style.transition = 'all 0.2s ease';

        if (!this.readOnly) {
            placeholder.addEventListener('mouseenter', () => {
                placeholder.style.backgroundColor = '#edf2f7';
                placeholder.style.borderColor = '#a0aec0';
            });

            placeholder.addEventListener('mouseleave', () => {
                placeholder.style.backgroundColor = '#f7fafc';
                placeholder.style.borderColor = '#cbd5e0';
            });
        }

        const icon = document.createElement('div');
        icon.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        icon.style.marginBottom = '12px';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';

        const text = document.createElement('div');
        text.textContent = this.readOnly ? 'No image selected' : (this.config.placeholder || 'Click to select an image');
        text.style.color = '#718096';
        text.style.fontSize = '14px';

        placeholder.appendChild(icon);
        placeholder.appendChild(text);

        if (!this.readOnly) {
            placeholder.addEventListener('click', () => {
                this._openImageSelector();
            });
        }

        this.wrapper.appendChild(placeholder);
    }

    _openImageSelector() {
        // Dispatch intent request event
        const requestId = `image-selector-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const intentRequest = {
            requestId,
            intentType: 'select-image',
            payload: {
                options: {
                    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    maxSize: 10 * 1024 * 1024, // 10MB
                    allowUpload: true
                }
            }
        };

        // Listen for response
        const handleResponse = (event: CustomEvent) => {
            const response = event.detail;
            if (response.success && response.payload?.media) {
                const media = response.payload.media;
                this.data = {
                    mediaId: media._id,
                    src: media.url,
                    alt: ''
                };
                this._createImage(media.url, '');
                this._notifyChange();
            }

            // Clean up listener
            window.removeEventListener(`intent:response:${requestId}`, handleResponse as EventListener);
        };

        window.addEventListener(`intent:response:${requestId}`, handleResponse as EventListener);

        // Dispatch the intent request
        window.dispatchEvent(new CustomEvent('intent:request', {
            detail: intentRequest,
            bubbles: true
        }));
    }

    _notifyChange() {
        console.log("Image Selector Tool change event", this.data);
        // EditorJS will automatically detect changes when save() is called
        // No manual triggering needed
    }

    save(blockContent: HTMLElement): ImageSelectorToolData {
        console.log("ImageSelectorTool save() called with data:", this.data);
        return {
            src: this.data.src || '',
            alt: this.data.alt || '',
            mediaId: this.data.mediaId || ''
        };
    }

    validate(savedData: ImageSelectorToolData) {
        return savedData.mediaId?.trim() !== '';
    }
}

export default ImageSelectorTool;