type BufferLike = ArrayBuffer | string | ArrayBufferView | Blob
type StreamLike = ReadableStream<Uint8Array> | AsyncIterable<BufferLike>

/** The file name, modification date and size will be read from the input;
 * extra arguments can be given to override the input’s metadata. */
 type InputWithMeta = File | Response | { input: File | Response, name?: any, lastModified?: any, size?: number | bigint }

 /** Intrinsic size, but the file name must be provided and modification date can’t be guessed. */
 type InputWithSizeMeta = { input: BufferLike, name: any, lastModified?: any, size?: number | bigint }
 
 /** The file name must be provided ; modification date and content length can’t be guessed. */
 type InputWithoutMeta = { input: StreamLike, name: any, lastModified?: any, size?: number | bigint }
 
 /** Both filename and size must be provided ; input is not helpful here. */
 type JustMeta = { input?: StreamLike | undefined, name: any, lastModified?: any, size: number | bigint }
 
 type ForAwaitable<T> = AsyncIterable<T> | Iterable<T>
 
 type Options = {
  /** If provided, the returned Response will have its `Content-Length` header set to this value.
  * It can be computed accurately with the `predictLength` function. */
  length?: number | bigint
  /** If provided, the returned Response will have its `Content-Length` header set to the result of
  * calling `predictLength` on that metadata. Overrides the `length` option. */
  metadata?: Iterable<InputWithMeta | InputWithSizeMeta | JustMeta>
} 

/** Given an iterable of file metadata (or equivalent),
 * @returns the exact byte length of the Zip file that would be generated by `downloadZip`. */
export declare function predictLength(files: Iterable<InputWithMeta | InputWithSizeMeta | JustMeta>): bigint

export declare function downloadZip(files: ForAwaitable<InputWithMeta | InputWithSizeMeta | InputWithoutMeta>, options?: Options): Response
