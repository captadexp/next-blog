#!/usr/bin/env bun

import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createPlugin(projectName?: string) {
    console.log(chalk.cyan('🚀 Creating Next-Blog Plugin...\n'));

    const targetDir = projectName ? path.join(process.cwd(), projectName) : process.cwd();
    const templatesDir = path.join(__dirname, '..', 'templates');

    try {
        // Create project directory if name was provided
        if (projectName) {
            await fs.mkdir(targetDir, {recursive: true});
            console.log(chalk.green(`✅ Created directory: ${projectName}`));
        }

        // Create src directory
        const srcDir = path.join(targetDir, 'src');
        try {
            await fs.access(srcDir);
            console.log(chalk.gray('ℹ️  src/ directory already exists'));
        } catch {
            await fs.mkdir(srcDir, {recursive: true});
            console.log(chalk.green('✅ Created src/ directory'));
        }

        // Skip vite.config.js - the CLI handles this internally

        // Copy tsconfig.json
        const tsconfigExists = await fs.access(path.join(targetDir, 'tsconfig.json')).then(() => true).catch(() => false);
        if (!tsconfigExists) {
            await fs.copyFile(
                path.join(templatesDir, 'tsconfig.json'),
                path.join(targetDir, 'tsconfig.json')
            );
            console.log(chalk.green('✅ Created tsconfig.json'));
        } else {
            console.log(chalk.gray('ℹ️  tsconfig.json already exists'));
        }

        // Copy plugin-env.d.ts
        const pluginEnvExists = await fs.access(path.join(targetDir, 'plugin-env.d.ts')).then(() => true).catch(() => false);
        if (!pluginEnvExists) {
            await fs.copyFile(
                path.join(templatesDir, 'plugin-env.d.ts'),
                path.join(targetDir, 'plugin-env.d.ts')
            );
            console.log(chalk.green('✅ Created plugin-env.d.ts'));
        }

        // Copy example plugin (as .ts file)
        const pluginExists = await fs.access(path.join(srcDir, 'index.ts')).then(() => true).catch(() => false);
        if (!pluginExists) {
            await fs.copyFile(
                path.join(templatesDir, 'plugin.ts'),
                path.join(srcDir, 'index.ts')
            );
            console.log(chalk.green('✅ Created src/index.ts'));
        } else {
            console.log(chalk.gray('ℹ️  src/index.ts already exists'));
        }

        // Copy client.tsx
        const clientExists = await fs.access(path.join(srcDir, 'client.tsx')).then(() => true).catch(() => false);
        if (!clientExists) {
            await fs.copyFile(
                path.join(templatesDir, 'client.tsx'),
                path.join(srcDir, 'client.tsx')
            );
            console.log(chalk.green('✅ Created src/client.tsx'));
        }

        // Copy server.ts
        const serverExists = await fs.access(path.join(srcDir, 'server.ts')).then(() => true).catch(() => false);
        if (!serverExists) {
            await fs.copyFile(
                path.join(templatesDir, 'server.ts'),
                path.join(srcDir, 'server.ts')
            );
            console.log(chalk.green('✅ Created src/server.ts'));
        }

        // Create package.json
        const packageJsonExists = await fs.access(path.join(targetDir, 'package.json')).then(() => true).catch(() => false);
        if (!packageJsonExists) {
            // Check if we're in a workspace
            const isInWorkspace = targetDir.includes('next-blog') && (targetDir.includes('packages') || targetDir.includes('plugins'));

            // Use the last part of the path as plugin name
            const pluginName = path.basename(targetDir);

            const packageJson = {
                name: pluginName,
                version: '1.0.0',
                type: 'module',
                scripts: {
                    build: 'next-blog build',
                    dev: 'next-blog dev',
                    watch: 'next-blog watch',
                    typecheck: 'tsc --noEmit'
                },
                devDependencies: {
                    '@supergrowthai/plugin-dev-kit': isInWorkspace ? 'workspace:*' : '^0.1.0',
                    'typescript': '^5.0.0',
                    'vite': '^5.0.0'
                },
                nextBlog: {
                    baseUrl: `http://localhost:3248/plugins/${pluginName}`,
                    devBaseUrl: `http://localhost:3001`
                }
            };

            await fs.writeFile(
                path.join(targetDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );
            console.log(chalk.green('✅ Created package.json'));
        } else {
            console.log(chalk.gray('ℹ️  package.json already exists'));
        }

        // Skip test.js - can be added manually if needed

        // Copy .gitignore if it doesn't exist
        const gitignoreExists = await fs.access(path.join(targetDir, '.gitignore')).then(() => true).catch(() => false);
        if (!gitignoreExists) {
            await fs.copyFile(
                path.join(templatesDir, '.gitignore'),
                path.join(targetDir, '.gitignore')
            );
            console.log(chalk.green('✅ Created .gitignore'));
        } else {
            console.log(chalk.gray('ℹ️  .gitignore already exists'));
        }

        console.log(chalk.cyan(`
✨ Plugin setup complete!

Next steps:`));

        if (projectName) {
            console.log(chalk.yellow(`  1. Navigate to your plugin:
     cd ${projectName}`));
        }

        console.log(chalk.yellow(`
  2. Install dependencies:
     bun install

  3. Start development:
     bun run dev

  4. Build your plugin:
     bun run build

📚 Documentation: https://github.com/supergrowthai/next-blog
`));

    } catch (error: any) {
        console.error(chalk.red('❌ Error creating plugin:'), error.message);
        process.exit(1);
    }
}

// Get project name from command line arguments
const projectName = process.argv[2];
createPlugin(projectName);