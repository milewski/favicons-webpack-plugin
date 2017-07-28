import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { loader } from "webpack";
import { CacheInterface, Result } from "./Interfaces/CacheInterface";
import { PluginOptionsInterface } from "./Interfaces/PluginOptionsInterface";
import ErrnoException = NodeJS.ErrnoException;

const version = require('../package.json').version;

/**
 * Stores the given iconResult together with the control hashes as JSON file
 */
export function emitCacheInformationFile(loader: loader.LoaderContext, options: PluginOptionsInterface, cacheFile: string, hash: string, result: Result) {

    if (!options.cache) return;

    const data = JSON.stringify(
        { hash, version, result: { ...result, cached: true }, optionHash: generateHashForOptions(options) }
    )

    loader.emitFile(cacheFile, data, null);

}

/**
 * Checks if the given cache object is still valid
 */
function isCacheValid(cache: CacheInterface, fileHash: string, options: PluginOptionsInterface): boolean {
    /**
     * Verify that the source file is the same
     * Verify that the options are the same
     * Verify that the favicons version of the cache matches this version
     */
    return cache.hash === fileHash &&
        cache.optionHash === generateHashForOptions(options) &&
        cache.version === version
}

type Options = {
    loader: any,
    options: PluginOptionsInterface,
    cacheFile: string,
    fileHash: string
}

/**
 * Try to load the file from the disc cache
 */
export function loadIconsFromDiskCache({ loader, options, cacheFile, fileHash }: Options, callback: (error: ErrnoException, result?: Result) => void) {

    /**
     * Stop if cache is disabled
     */
    if (!options.cache) return callback(null);

    const resolvedCacheFile = path.resolve(
        loader._compiler.outputPath, cacheFile
    );

    fs.exists(resolvedCacheFile, exists => {

        if (!exists) return callback(null);

        /**
         * Only throws if file exists, but can't be read
         */
        fs.readFile(resolvedCacheFile, (error, content: Buffer) => {

            if (error) return callback(error);

            let cache;

            try {

                cache = JSON.parse(content.toString('utf8')) as CacheInterface;

                /**
                 * Bail out if the file or the option changed
                 */
                if (!isCacheValid(cache, fileHash, options)) {
                    return callback(null);
                }

            } catch (e) {
                return callback(null);
            }

            callback(null, cache.result);

        });

    });

}

/**
 * Generates a md5 hash for the given options
 */
function generateHashForOptions(options: PluginOptionsInterface): string {
    return crypto.createHash('md5').update(JSON.stringify(options)).digest('hex');
}
