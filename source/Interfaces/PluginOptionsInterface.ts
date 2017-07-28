import { OptionsInterface } from "./OptionsInterface";

export interface PluginOptionsInterface extends Partial<OptionsInterface> {
    source: string
    emitStats?: boolean
    cache?: boolean
    statsFilename?: string
    inject?: boolean
    publicPath?: string
    copyFaviconToRoot?: boolean
}
