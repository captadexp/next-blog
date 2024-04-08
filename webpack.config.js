const webpack =/** @type { import('webpack') } */  require('webpack');
const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = (env, args) => {
    const isProduction = args && args['mode'] === 'production';
    console.log('****');
    console.log(isProduction ? 'PRODUCTION BUILD' : 'DEVELOPMENT BUILD');
    console.log('****');

    const config = /** @type { import('webpack').Configuration } */ {
        entry: {
            'render/index': path.resolve('./src/render/index.tsx'),
        },
        output: {
            path: path.resolve('./'),
            library: {type: 'umd'}
        },
        optimization: {},

        target: 'web',
        devtool: isProduction ? false : 'inline-source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.html', '.txt'],
        },
        module: {
            rules: [
                {
                    test: /.s?css$/,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : {
                            loader: 'style-loader',
                            options: {
                                insert: 'head',
                                // injectType: 'singletonStyleTag'
                            },
                        },
                        {
                            loader: "css-loader",
                            options: {
                                modules: {
                                    localIdentName: '[name]__[local]___[hash:base64:5]',
                                    exportLocalsConvention: 'camelCase'
                                }
                            },
                        },
                        "sass-loader"
                    ],
                },

                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [{
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            compilerOptions: {declaration: true, declarationMap: true}
                        },
                    }],
                }
            ],
        },

        watchOptions: {
            aggregateTimeout: 100,
            ignored: /node_modules/,
            poll: 300
        },

        devServer: {
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            static: {directory: './dist'},
            compress: false,
            port: 3030,
            host: "local.developer.toys",
        },

        plugins: [
            new webpack.EnvironmentPlugin({
                NODE_ENV: isProduction ? 'production' : 'development',
                DEBUG: !isProduction,
            }),
            new MiniCssExtractPlugin()
        ],
    };

    if (isProduction) {
        config.optimization.minimize = false;
        config.optimization.minimizer = [
            // new TerserPlugin({extractComments: false}),
            new CssMinimizerPlugin(),
        ]
    }

    return config;
}
