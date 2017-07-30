import { execSync } from "child_process";
import * as path from 'path';
import { CompilerTemplate } from "./compiler";
import { Compilation } from "./Interfaces/Compilation";
import { Compiler } from "./Interfaces/Compiler";
import { Icons, IconsType, Manifest, PluginOptionsInterface } from "./Interfaces/PluginOptionsInterface";

export class FaviconsWebpackPlugin {

    public options: PluginOptionsInterface = {
        source: null,
        manifest: true,
        export: false,
        inject: true,
        icons: 'default',
        publicPath: '',
        path: 'icons-[hash]',
        configuration: {}
    }

    constructor(options: PluginOptionsInterface | string) {

        if (!options) throw 'Please specify where your main icon file is located.'

        /**
         * Accept a string as the source and use all the default options
         */
        if (typeof options === 'string') {
            options = { source: options as string };
        }

        this.options = { ...this.options, ...options }
        this.options.configuration.icons = this.parseIcons(this.options.icons)
        this.options.configuration.icons = this.parseManifest(this.options.configuration.icons, this.options.manifest)
        this.options.configuration.path = this.options.path

        if (!this.options.configuration.appName) {
            this.options.configuration.appName = this.guessAppName();
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
        if (!this.options.export) {

            compiler.plugin('emit', (compilation, callback) => {
                delete compilation.assets[ compilationResult.outputName ] && callback();
            });

        }

    };

    private parseManifest(icons: Partial<Icons>, manifest: Manifest): Partial<Icons> {

        if (typeof manifest === 'object') {

            for (let key in manifest) {

                if (typeof manifest[ key ] === 'boolean') {
                    if (!manifest[ key ] || typeof icons[ key ] !== 'object') {
                        icons[ key ] = manifest[ key ]
                    }
                }

                if (typeof manifest[ key ] === 'string' && typeof icons[ key ] === 'boolean') {
                    icons[ key ] = true
                }

            }

        }

        /**
         * If manifest is set to false,
         * disable all "manifestable" icons
         */
        if (typeof manifest === 'boolean' && !manifest) {
            [ 'android', 'windows', 'yandex', 'firefox' ].forEach(platform => {
                icons[ platform ] = false
            })
        }

        return icons

    }

    /**
     * Return the desired icons
     */
    private parseIcons(icons: IconsType): Partial<Icons> {

        if (typeof icons === 'object') {
            return icons
        }

        const options = (enable: boolean) => {
            return {
                android: enable,
                appleIcon: enable,
                appleStartup: enable,
                coast: enable,
                favicons: enable,
                firefox: enable,
                windows: enable,
                yandex: enable
            }
        }

        const cases = {
            default: {},
            dev: { ...options(false), ...{ favicons: true } }
        }

        return cases[ icons ]

    }

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
