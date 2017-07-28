import { execSync } from "child_process";
import * as path from 'path';
import { CompilerTemplate } from "./compiler";
import { Compilation } from "./Interfaces/Compilation";
import { Compiler } from "./Interfaces/Compiler";
import { PluginOptionsInterface } from "./Interfaces/PluginOptionsInterface";

export class FaviconsWebpackPlugin {

    public options: PluginOptionsInterface = {
        source: null,
        emitStats: false,
        statsFilename: 'icons-stats-[hash].json',
        cache: true,
        inject: true,

        path: 'icons-[hash]'
    }

    constructor(options: PluginOptionsInterface | string) {

        if (!options) throw 'Please specify where your main icon file is located.'

        /**
         * Accept a string as the source and use all the default options
         */
        if (typeof options === 'string') {
            options = { source: options as string };
        }

        this.options = Object.assign({}, this.options, options)

        if (!this.options.appName) {
            this.options.appName = this.guessAppName();
        }

    }

    public apply(compiler: Compiler): void {

        /**
         * Generated the favicons
         */
        let compilationResult;

        compiler.plugin('make', (compilation: Compilation, callback) => {

            new CompilerTemplate(this.options, compiler.context, compilation)
                .compile()
                .then(result => (compilationResult = result) && callback())
                .catch(callback);

        });

        /**
         * Hook into the html-webpack-plugin processing and add the html
         */
        if (this.options.inject) {

            compiler.plugin('compilation', compilation => {

                compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {

                    if (htmlPluginData.plugin.options.favicons !== false) {

                        const fourSpaces = '\n' + '\xa0'.repeat(4)

                        htmlPluginData.html = htmlPluginData.html.replace(
                            /(\s*<\/head>)/i, `\n${fourSpaces}` + compilationResult.stats.html.join(fourSpaces) + '\n$&'
                        );

                    }

                    callback(null, htmlPluginData);

                });

            });

        }

        /**
         * Remove the stats from the output if they are not required
         */
        if (!this.options.emitStats) {

            compiler.plugin('emit', (compilation, callback) => {
                delete compilation.assets[ compilationResult.outputName ] && callback();
            });

        }

    };

    /**
     * Tries to guess the name from the package.json
     */
    private guessAppName(): string {

        const name = 'Webpack App';
        const root = execSync('npm prefix');

        return require(
            path.resolve(root.toString('utf8').trim(), 'package.json')
        ).name || name

    }

}
