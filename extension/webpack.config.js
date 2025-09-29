//@ts-check

"use strict";

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require("html-inline-script-webpack-plugin");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

// Resolve a single canonical path for @pmndrs/uikit to avoid duplicates across the monorepo
const uikitPackageRoot = path.dirname(require.resolve("@pmndrs/uikit/package.json"));

/** @type WebpackConfig */
const extensionConfig = {
  target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/extension/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
    // Allow workspace packages that import .js to resolve .ts sources
    extensionAlias: {
      ".js": [".ts", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};

/** @type WebpackConfig */
const webviewConfig = {
  target: "web",
  mode: "development", // Changed from production to development
  entry: "./src/webview/core/index.ts",
  output: {
    filename: "webview.js",
    path: path.resolve(__dirname, "dist/webview"),
  },
  optimization: {
    minimize: false, // Disable minification completely
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    // Allow workspace packages that import .js to resolve .ts sources
    extensionAlias: {
      ".js": [".ts", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    alias: {
      // Deduplicate @pmndrs/uikit by pinning to a single resolved path
      "@pmndrs/uikit": uikitPackageRoot,
      // Some kit builds reference internal uikit source paths; alias them to dist
      "@pmndrs/uikit/src/utils.js": require.resolve("@pmndrs/uikit/dist/utils.js"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
          compilerOptions: {
            module: "esnext",
            target: "es2015",
            lib: ["dom", "es2015", "dom.iterable"],
            sourceMap: true,
            strict: true,
            esModuleInterop: true,
            moduleResolution: "bundler",
            allowSyntheticDefaultImports: true,
            skipLibCheck: true,
            jsx: "react",
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/webview/index.html",
      filename: "index.html",
    }),
    new HtmlInlineScriptPlugin({ scriptMatchPattern: [/webview.js$/] }),
  ],
  devtool: "source-map", // Add source maps for better debugging
  cache: {
    type: "filesystem",
  },
};

/** @type WebpackConfig */
const serverConfig = {
  target: "node",
  mode: "none",
  entry: "./src/server/uikitml-language-server.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "server.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
    // Allow workspace packages that import .js to resolve .ts sources
    extensionAlias: {
      ".js": [".ts", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log",
  },
};

module.exports = [extensionConfig, webviewConfig, serverConfig];
