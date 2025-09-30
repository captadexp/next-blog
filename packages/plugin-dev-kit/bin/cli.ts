#!/usr/bin/env bun
import {program} from 'commander';
import {buildPlugin, devServer, watchPlugin} from '../dist/build/index.js';
import {resolve} from 'path';
import chalk from 'chalk';

// Generate random port between 60000-65535
const getRandomPort = () => Math.floor(Math.random() * 5536) + 60000;

program
    .name('next-blog')
    .description('CLI for Next Blog plugin development')
    .version('0.1.0');

program
    .command('build')
    .description('Build a plugin for production')
    .option('-p, --path <path>', 'Plugin source directory', '.')
    .option('-o, --output <output>', 'Output directory', './dist')
    .action(async (options) => {
        const sourcePath = resolve(options.path);
        const outputPath = resolve(options.output);

        console.log(chalk.cyan('🚀 Building plugin...'));
        console.log(chalk.gray(`Source: ${sourcePath}`));
        console.log(chalk.gray(`Output: ${outputPath}`));

        try {
            await buildPlugin({
                root: sourcePath,
                outDir: outputPath,
            });
            console.log(chalk.green('✅ Plugin built successfully!'));
        } catch (error) {
            console.error(chalk.red('❌ Build failed:'), error);
            process.exit(1);
        }
    });

program
    .command('dev')
    .description('Start development server with hot reload')
    .option('-p, --path <path>', 'Plugin source directory', '.')
    .option('--port <port>', 'Dev server port')
    .action(async (options) => {
        const sourcePath = resolve(options.path);
        const port = options.port ? parseInt(options.port) : getRandomPort();

        console.log(chalk.cyan('🚀 Starting development server...'));
        console.log(chalk.gray(`Source: ${sourcePath}`));
        console.log(chalk.gray(`Port: ${port}`));

        try {
            await devServer({
                root: sourcePath,
                port: port,
            });
        } catch (error) {
            console.error(chalk.red('❌ Dev server failed:'), error);
            process.exit(1);
        }
    });

program
    .command('watch')
    .description('Watch and rebuild on changes')
    .option('-p, --path <path>', 'Plugin source directory', '.')
    .option('-o, --output <output>', 'Output directory', './dist')
    .action(async (options) => {
        const sourcePath = resolve(options.path);
        const outputPath = resolve(options.output);

        console.log(chalk.cyan('👀 Watching for changes...'));
        console.log(chalk.gray(`Source: ${sourcePath}`));
        console.log(chalk.gray(`Output: ${outputPath}`));

        try {
            await watchPlugin({
                root: sourcePath,
                outDir: outputPath,
            });
        } catch (error) {
            console.error(chalk.red('❌ Watch failed:'), error);
            process.exit(1);
        }
    });

program.parse();