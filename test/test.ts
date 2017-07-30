import * as expect from "expect.js";
import * as fs from "fs-extra";
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import { runLoaders } from "loader-runner";
import * as path from "path";
import { Result } from "../source/Interfaces/CacheInterface";
import { PluginOptionsInterface } from "../source/Interfaces/PluginOptionsInterface";
import { FaviconsWebpackPlugin } from "../source/plugin";

function cleanUp() {
    try {
        fs.removeSync(path.resolve(__dirname, 'temp'))
    } catch (e) {
        // do nothing
    }
}

const source = require.resolve('./fixtures/source.png')
const manifests = {
    android: require.resolve('./fixtures/manifest.json'),
    windows: require.resolve('./fixtures/browserconfig.xml'),
    firefox: require.resolve('./fixtures/manifest.webapp'),
    yandex: require.resolve('./fixtures/yandex-browser-manifest.json'),
}

function runner(options: PluginOptionsInterface, callback: Function) {
    runLoaders({
            readResource: fs.readFile.bind(fs),
            resource: path.resolve(__dirname, source),
            context: {
                _compiler: { outputPath: __dirname },
                options: { context: __dirname },
                emitFile: (name, buffer) => {
                    fs.ensureDirSync(path.resolve(__dirname, path.dirname(name)))
                    fs.writeFileSync(path.resolve(__dirname, name), buffer, { encoding: 'utf8' })
                },
            },
            loaders: [
                {
                    loader: path.resolve(__dirname, '../source/loader'),
                    options: { ...new FaviconsWebpackPlugin(options).options }
                }
            ],
        },
        (error, { resourceBuffer, result }) => {
            if (!error) expect(result).to.have.length(1)
            callback({ error, input: resourceBuffer, output: result ? result[ 0 ] : null })
        }
    )
}

const baseWebpackConfig = (options = {}): any => {
    return {
        entry: path.resolve(__dirname, 'fixtures/entry.js'),
        output: {
            path: path.resolve(__dirname, 'temp')
        },
        plugins: [
            new FaviconsWebpackPlugin({ source, ...options }),
            new HtmlWebpackPlugin()
        ]
    };
}

describe('Loader', () => {

    beforeEach(() => cleanUp())
    // after(() => cleanUp())

    it('should throw error when called without arguments', () => {
        expect(() => { new FaviconsWebpackPlugin(undefined as any) }).to.throwException(/Please specify where your main icon file is located\./)
    })

    it('should take a string as argument', () => {
        const plugin = new FaviconsWebpackPlugin(source)
        expect(plugin.options.source).to.be(source)
    })

    it('should take an object with just the source as argument', () => {
        const plugin = new FaviconsWebpackPlugin({ source: source })
        expect(plugin.options.source).to.be(source)
    })

    it('should override icons correctly (as object)', () => {

        const options = {
            android: true,
            windows: false,
            yandex: false,
            firefox: true
        };

        const plugin = new FaviconsWebpackPlugin({
            source: source,
            manifest: options,
            icons: {
                android: false,
                windows: false,
                yandex: true
            }
        })

        for (let key in options) {
            expect(plugin.options.configuration.icons[ key ]).to.be(options[ key ])
        }

    })

    it('should override icons correctly (as undefined)', () => {

        const options = {
            android: true,
            windows: false,
            yandex: false,
            firefox: true
        };

        const plugin = new FaviconsWebpackPlugin({
            source: source,
            manifest: options,
            // icons: {} undefined
        })

        for (let key in options) {
            expect(plugin.options.configuration.icons[ key ]).to.be(options[ key ])
        }

    })

    it('should override icons correctly (as boolean)', () => {

        const options = {
            android: true,
            windows: false,
            yandex: false,
            firefox: true
        };

        const plugin = new FaviconsWebpackPlugin({
            source: source,
            manifest: true,
            icons: options
        })

        for (let key in options) {
            expect(plugin.options.configuration.icons[ key ]).to.be(options[ key ])
        }

    })

    it('should disable all "manifestable" icons if set to false', () => {

        const plugin = new FaviconsWebpackPlugin({ source: source, manifest: false });

        [ 'android', 'windows', 'yandex', 'firefox' ].forEach(platform => {
            expect(plugin.options.configuration.icons[ platform ]).to.be(false)
        })

    })

    it('should override all the relevant options accordingly', () => {

        const plugin = new FaviconsWebpackPlugin({
            source: source,
            manifest: {
                android: false, firefox: manifests.firefox, windows: manifests.windows, yandex: true
            },
            icons: {
                android: { offset: 10 }, firefox: false, windows: { background: 'red' }, yandex: { background: 'green' }
            }
        })

        expect(plugin.options.manifest[ 'firefox' ]).to.eql(manifests.firefox)
        expect(plugin.options.manifest[ 'yandex' ]).to.be(true)
        expect(plugin.options.manifest[ 'android' ]).to.be(false)

        expect(plugin.options.configuration.icons.android).to.be(false)
        expect(plugin.options.configuration.icons.firefox).to.be(true)
        expect(plugin.options.configuration.icons.windows).to.eql({ background: 'red' })
        expect(plugin.options.configuration.icons.yandex).to.eql({ background: 'green' })

    })

    it('should generate the expected default result', done => {

        runner({
            source: source,
            path: 'temp/icons'
        }, ({ output }) => {

            const result = eval(output) as Result;

            /**
             * As by today (7/27/2017) the default options outputs 34 assets
             */
            expect(result.html.length).to.be(34)

            result.html.forEach(item => {
                expect(item).match(/<("[^"]*"|'[^']*'|[^'">])*>/)
            })

            /**
             * Ensure that files got written to disk
             */
            const files = fs.readdirSync(path.resolve(__dirname, 'temp/icons'))
            expect(files.length).to.be(48)

            done()

        })

    })

    it('should generate only one ico file in dev mode', done => {

        runner({
            source: source,
            path: 'temp/icons',
            icons: 'dev'
        }, ({ output }) => {

            const result = eval(output) as Result;

            expect(result.html.length).to.be(1)

            result.html.forEach(item => {
                expect(item).match(/<("[^"]*"|'[^']*'|[^'">])*>/)
            })

            /**
             * Ensure that files got written to disk
             */
            const files = fs.readdirSync(path.resolve(__dirname, 'temp/icons'))
            expect(files.length).to.be(1)

            done()

        })

    })

    it('should not emit the manifest file if set to not to do so', done => {

        runner({
            source: source,
            path: 'temp/icons',
            manifest: false,
            icons: { android: true }
        }, ({ output }) => {

            const result = eval(output) as Result;

            result.images.forEach(name => {
                [ 'android', 'mstile', 'yandex', 'firefox' ].forEach(platform => {
                    expect(name).to.not.contain(platform);
                })
            })

            expect(result.files).to.have.length(0);

            result.html.forEach(item => {
                expect(item).to.match(/<("[^"]*"|'[^']*'|[^'">])*>/)
            })

            done()

        })

    })

    it('should emit the manifests for the chosen platforms', done => {

        runner({
            source: source,
            path: 'temp/icons',
            manifest: {
                android: false,
                firefox: true,
                windows: false
            }
        }, ({ output }) => {

            const result = eval(output) as Result;
            // result.files.forEach(file => {
            //     console.log(file)
            // })
            // console.log('-'.repeat(10))
            // result.html.forEach(file => {
            //     console.log(file)
            // })

            /**
             * @todo
             */

            // expect(result.html).to.contain('manifest.webapp')
            // expect(result.html).to.contain('yandex-browser-manifest.json')
            // expect(result.html).to.not.contain('browserconfig.xml')
            // expect(result.html).to.not.contain('manifest.json')

            done()

        })

    })
//
//     it('it should only generate the dev icons', done => {
//
//
// //         webpack(baseWebpackConfig({
// //             icons: 'dev'
// //         }), (error, result) => {
// // // console.log(result['assets'])
// //             // console.log(error,result)
// //
// //             done()
// //
// //         })
//
//     })

})
