import * as expect from "expect.js";
import * as fs from "fs-extra";
import { runLoaders } from "loader-runner";
import * as path from "path";
import * as webpack from "webpack";
import { Result } from "../source/Interfaces/CacheInterface";
import { FaviconsWebpackPlugin } from "../source/plugin";

function cleanUp() {
    try {
        fs.removeSync(path.resolve(__dirname, 'temp'))
    } catch (e) {
        // do nothing
    }
}

const source = require.resolve('./fixtures/source.png')

function runner(options: { [key: string]: any }, callback: Function) {
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
                { loader: path.resolve(__dirname, '../source/loader'), options }
            ],
        },
        (error, { resourceBuffer, result }) => {
            if (!error) expect(result).to.have.length(1)
            callback({ error, input: resourceBuffer, output: result ? result[ 0 ] : null })
        }
    )
}


const baseWebpackConfig = (options): any => {
    return {
        entry: path.resolve(__dirname, 'sample-files/entry.js'),
        output: {
            path: path.resolve(__dirname, 'temp')
        },
        plugins: [
            new FaviconsWebpackPlugin({ source, ...options }),
        ]
    };
}

describe('Loader', () => {

    // after(() => cleanUp())
    // before(() => cleanUp())

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

    it('should generate the expected default result', done => {

        runner({
            source: source,
            path: 'temp/icons',
            cache: true
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
            expect(files.length).to.be(49)

            /**
             * Ensure we are not using a cached version
             */
            expect(result.cached).to.be(false)

            done()

        })

    })

    it('should not recompile if there is a cache file', done => {

        /**
         * Using the same settings as the previous
         * Test would result in a cached version of the cache to validate
         */
        runner({
            source: source,
            path: 'temp/icons',
            cache: true
        }, ({ output }) => {
            expect(eval(output).cached).to.be(true)
            done()
        })

    })

    it('should generate a configured JSON file', done => {

        webpack(baseWebpackConfig({
            emitStats: true,
            cache: false,
            statsFilename: 'icons-stats.json',
            path: '[hash]'
        }), (error, stats) => {

            const json = fs.readFileSync(path.resolve(__dirname, 'temp/icons-stats.json'))
            expect(JSON.parse(json).html).to.length(34)

            done(error)

        })

    })

})
