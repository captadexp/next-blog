import type {Plugin} from 'vite';

/**
 * Creates a plugin that generates TypeScript declarations for CSS modules
 */
export function createCssModuleTypesPlugin(root: string): Plugin {
    return {
        name: 'css-module-types',
        buildStart() {
            const fs = require('fs');
            const path = require('path');

            // Create a global CSS modules declaration file
            const cssModulesDeclaration = `// Auto-generated CSS modules type declarations
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
`;
            const declarationPath = path.resolve(root, 'src', 'css-modules.d.ts');
            fs.writeFileSync(declarationPath, cssModulesDeclaration);
        }
    };
}