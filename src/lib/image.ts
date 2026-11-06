/**
 * Browser-side image preparation for DeepSeek vision.
 *
 * Photos from a phone are often 4–12 MB and 4000 px wide. Sending them raw is
 * slow, expensive (image tokens) and can exceed the request-body limit, so we
 * downscale and re-encode before anything leaves the device. The original file
 * is never uploaded.
 */

export interface PreparedImage {
  /** JPEG data URL sent to the server for recognition. */
  dataUrl: string
  /** Small JPEG data URL kept in IndexedDB for the material card. */
  thumbnail: string
  width: number
  height: number
  /** Approximate byte size of `dataUrl`. */
  bytes: number
  name: string
}

const SUPPORTED_TYPES = /^image\/(jpeg|png|webp|gif)$/i
const MAX_SIDE = 1800
const THUMB_SIDE = 420
const MAX_DATA_URL_CHARS = 3_300_000

export function isSupportedImageFile(file: File): boolean {
  return SUPPORTED_TYPES.test(file.type)
}

function createCanvas(
  source: ImageBitmap | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  maxSide: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器无法处理这张图片，请换一张再试。')
  }

  // A white base keeps transparent PNG/WebP screenshots readable as JPEG.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function loadImage(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> path (some browsers reject certain GIFs).
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('无法读取这张图片。'))
      image.src = objectUrl
    })
  } finally {
    // The decoded image stays drawable after the URL is released.
    URL.revokeObjectURL(objectUrl)
  }
}

function approximateBytes(dataUrl: string): number {
  const separator = dataUrl.indexOf(',')
  const base64 = separator >= 0 ? dataUrl.slice(separator + 1) : dataUrl
  return Math.round(base64.length * 0.75)
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isSupportedImageFile(file)) {
    throw new Error('只支持 JPEG / PNG / WebP / GIF 图片。')
  }

  const source = await loadImage(file)
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height

  if (!width || !height) {
    throw new Error('无法读取图片尺寸，请换一张再试。')
  }

  try {
    let maxSide = MAX_SIDE
    let canvas = createCanvas(source, width, height, maxSide)
    let quality = 0.88
    let dataUrl = canvas.toDataURL('image/jpeg', quality)

    while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.52) {
      quality -= 0.08
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    while (dataUrl.length > MAX_DATA_URL_CHARS && maxSide > 1100) {
      maxSide -= 250
      canvas = createCanvas(source, width, height, maxSide)
      quality = 0.8
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error('图片太大，压缩后仍超过 3 MB。请裁剪后再试。')
    }

    const thumbCanvas = createCanvas(source, width, height, THUMB_SIDE)
    const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.72)

    return {
      dataUrl,
      thumbnail,
      width: canvas.width,
      height: canvas.height,
      bytes: approximateBytes(dataUrl),
      name: file.name,
    }
  } finally {
    if ('close' in source) source.close()
  }
}
