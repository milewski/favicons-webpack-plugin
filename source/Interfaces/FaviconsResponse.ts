export interface FaviconsResponse {
    images: { name: string, contents: Buffer }[]
    files: { name: string, contents: string }[]
    html: string[]
}

export interface FaviconsError {
    status: number | null
    name: string
    message: string
}
