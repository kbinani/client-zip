import "./polyfills.ts"
import { BufferLike, StreamLike, normalizeInput, ReadableFromIterator } from "./input.ts"
import { normalizeMetadata } from "./metadata.ts"
import { loadFiles, contentLength, ForAwaitable } from "./zip.ts"

/** The file name, modification date and size will be read from the input;
 * extra arguments can be given to override the input’s metadata. */
type InputWithMeta = File | Response | { input: File | Response, name?: any, lastModified?: any, size?: number | bigint }

/** Intrinsic size, but the file name must be provided and modification date can’t be guessed. */
type InputWithSizeMeta = { input: BufferLike, name: any, lastModified?: any, size?: number | bigint }

/** The file name must be provided ; modification date and content length can’t be guessed. */
type InputWithoutMeta = { input: StreamLike, name: any, lastModified?: any, size?: number | bigint }

/** The folder name must be provided ; modification date can’t be guessed. */
type InputFolder = { name: any, lastModified?: any, input?: never, size?: never }

/** Both filename and size must be provided ; input is not helpful here. */
type JustMeta = { input?: StreamLike | undefined, name: any, lastModified?: any, size: number | bigint }

export type Options = {
  /** If provided, the returned Response will have its `Content-Length` header set to this value.
   * It can be computed accurately with the `predictLength` function. */
  length?: number | bigint
  /** If provided, the returned Response will have its `Content-Length` header set to the result of
   * calling `predictLength` on that metadata. Overrides the `length` option. */
  metadata?: Iterable<InputWithMeta | InputWithSizeMeta | JustMeta>
  /** The ZIP *language encoding flag* will always be set when a filename was given as a string,
   * but when it is given as an ArrayView or ArrayBuffer, it depends on this option :
   * - `true`: always on (ArrayBuffers will *always* be flagged as UTF-8) — recommended,
   * - `false`: always off (ArrayBuffers will *never* be flagged as UTF-8),
   * - `undefined`: each ArrayBuffer will be tested and flagged if it is valid UTF-8. */
  buffersAreUTF8?: boolean
  filename?: string;
  cacheControl?: string;
}

function normalizeArgs(file: InputWithMeta | InputWithSizeMeta | InputWithoutMeta | InputFolder | JustMeta) {
  return file instanceof File || file instanceof Response
    ? [[file], [file]] as const
    : [[file.input, file.name, file.size], [file.input, file.lastModified]] as const
}

function* mapMeta(files: Iterable<InputWithMeta | InputWithSizeMeta | JustMeta | InputFolder>) {
  // @ts-ignore type inference isn't good enough for this… yet…
  // but rewriting the code to be more explicit would make it longer
  for (const file of files) yield normalizeMetadata(...normalizeArgs(file)[0])
}

function mapFiles(files: ForAwaitable<InputWithMeta | InputWithSizeMeta | InputWithoutMeta | InputFolder>) {
  // @ts-ignore TypeScript really needs to catch up
  const iterator = files[Symbol.iterator in files ? Symbol.iterator : Symbol.asyncIterator]()
  return {
    async next() {
      const res = await iterator.next()
      if (res.done) return res
      const [metaArgs, dataArgs] = normalizeArgs(res.value)
      // @ts-ignore type inference isn't good enough for this… yet…
      // but rewriting the code to be more explicit would make it longer
      return { done: false, value: Object.assign(normalizeInput(...dataArgs), normalizeMetadata(...metaArgs)) }
    },
    throw: iterator.throw?.bind(iterator),
    [Symbol.asyncIterator]() { return this }
  }
}

/** Given an iterable of file metadata (or equivalent),
 * @returns the exact byte length of the Zip file that would be generated by `downloadZip`. */
export const predictLength = (files: Iterable<InputWithMeta | InputWithSizeMeta | JustMeta | InputFolder>) => contentLength(mapMeta(files))

export function downloadZip(files: ForAwaitable<InputWithMeta | InputWithSizeMeta | InputWithoutMeta | InputFolder>, options: Options = {}) {
  const headers: Record<string, any> = { "Content-Type": "application/zip", "Content-Disposition": "attachment" }
  if ((typeof options.length === "bigint" || Number.isInteger(options.length)) && options.length! > 0) headers["Content-Length"] = String(options.length)
  if (options.metadata) headers["Content-Length"] = String(predictLength(options.metadata))
  if (options.filename) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(options.filename)}`
  if (options.cacheControl) headers["Cache-Control"] = options.cacheControl;
  return new Response(makeZip(files, options), { headers })
}

export function makeZip(files: ForAwaitable<InputWithMeta | InputWithSizeMeta | InputWithoutMeta | InputFolder>, options: Options = {}) {
  const mapped = mapFiles(files)
  return ReadableFromIterator(loadFiles(mapped, options), mapped);
}
