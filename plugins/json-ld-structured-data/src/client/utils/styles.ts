export function injectStyles(): void {
    if (typeof document !== 'undefined' && !document.getElementById('json-ld-styles')) {
        const style = document.createElement('style');
        style.id = 'json-ld-styles';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}