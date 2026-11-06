import { readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const source = readFileSync(new URL('../public/icons/app-icon.svg', import.meta.url))
const iconsDir = fileURLToPath(new URL('../public/icons', import.meta.url))
await mkdir(iconsDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-maskable-512.png', size: 512 },
]

for (const { file, size } of targets) {
  const svg =
    file === 'icon-maskable-512.png'
      ? source
          .toString('utf8')
          .replace('translate(256 256) scale(7)', 'translate(256 256) scale(5.7)')
      : source

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(`../public/icons/${file}`, import.meta.url)))
}

// Windows shortcut icon. The ICO stores PNG payloads (supported by Windows
// Vista and later), so no extra image dependency is needed.
const icoSizes = [256, 64, 32]
const icoImages = []
for (const size of icoSizes) {
  icoImages.push({
    size,
    png: await sharp(source).resize(size, size).png({ compressionLevel: 9 }).toBuffer(),
  })
}

const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(icoImages.length, 4)

let imageOffset = 6 + 16 * icoImages.length
const entries = icoImages.map((image) => {
  const entry = Buffer.alloc(16)
  entry[0] = image.size === 256 ? 0 : image.size
  entry[1] = image.size === 256 ? 0 : image.size
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(image.png.length, 8)
  entry.writeUInt32LE(imageOffset, 12)
  imageOffset += image.png.length
  return entry
})

writeFileSync(
  fileURLToPath(new URL('../public/icons/linguadesk.ico', import.meta.url)),
  Buffer.concat([icoHeader, ...entries, ...icoImages.map((image) => image.png)]),
)

console.log('Generated PWA icons in public/icons')
