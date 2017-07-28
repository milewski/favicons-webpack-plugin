import * as favicons from 'favicons'
import { getOptions, interpolateName } from 'loader-utils';
import * as path from "path";
import { loader } from "webpack";
import { emitCacheInformationFile, loadIconsFromDiskCache } from './cache';
import { Result } from "./Interfaces/CacheInterface";
import { Compilation } from "./Interfaces/Compilation";
import { FaviconsError, FaviconsResponse } from "./Interfaces/FaviconsResponse";
import { PluginOptionsInterface } from "./Interfaces/PluginOptionsInterface";

export const raw = true;
export default function (content: Buffer) {

    const callback = this.async();
    const options = getOptions(this) as PluginOptionsInterface;

    this.cacheable(options.cache)

    options.path = interpolateName(this, addTrailingSlash(options.path), {
        context: this.options.context,
        content: content
    });

    const fileHash = interpolateName(this, '[hash]', {
        context: this.options.context,
        content: content
    });

    const cacheFile = path.join(options.path, '.cache');

    loadIconsFromDiskCache({ loader: this, options, cacheFile, fileHash }, (error, cachedResult) => {

        if (error) return callback(error);

        if (cachedResult) {
            return callback(null, 'module.exports = ' + JSON.stringify(cachedResult));
        }

        /**
         * Generate icons
         */
        generateIcons(this, content, options, (error, iconResult) => {

            if (error) return callback(error);

            emitCacheInformationFile(this, options, cacheFile, fileHash, iconResult);

            callback(null, 'module.exports = ' + JSON.stringify(iconResult));

        });

    });

};

export function getPublicPath(compilation: Compilation): string {
    return addTrailingSlash(
        compilation.outputOptions.publicPath || ''
    );
}

function addTrailingSlash(path: string): string {
    return path.endsWith('/') ? path : path.concat('/')
}

function generateIcons(loader: loader.LoaderContext, imageFileStream: Buffer, options: PluginOptionsInterface, callback: (error, result?: Result) => void) {

    favicons(imageFileStream, {
        ...options, path: options.publicPath + options.path
    }, (error: FaviconsError, result: FaviconsResponse) => {

        if (error) return callback(error.message);

        const loaderResult: Result = {
            files: result.files,
            images: result.images.map(item => item.name),
            html: result.html,
            cached: false
        };

        [].concat(result.images, result.files).forEach(item => {
            loader.emitFile(options.path + item.name, item.contents, null);
        });

        callback(null, loaderResult);

    });

}
