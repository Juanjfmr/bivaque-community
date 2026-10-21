import { crc32, deflateSync } from "node:zlib"
import sharp from "sharp"

export async function animatedLocationImage(): Promise<File> {
  const bytes = await sharp(Buffer.from([255, 0, 0, 0, 255, 0]), {
    raw: { width: 1, height: 2, channels: 3, pageHeight: 1 },
  })
    .withMetadata({ orientation: 6 })
    .webp({ lossless: true, loop: 0, delay: [100, 100] })
    .toBuffer()
  return new File([new Uint8Array(bytes)], "animated.webp", { type: "image/webp" })
}

// Valid monochrome PNG: only ~32 MB while constructing the 256 MP fixture.
// Never allocate a decoded 16000 x 16000 RGB image just to test its rejection.
export function oversizedPixelImage(): File {
  function chunk(type: string, data: Buffer) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const payload = Buffer.concat([Buffer.from(type), data])
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(payload))
    return Buffer.concat([length, payload, checksum])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(16000, 0)
  header.writeUInt32BE(16000, 4)
  header[8] = 1 // one bit per grayscale pixel
  const bytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((16000 / 8 + 1) * 16000))),
    chunk("IEND", Buffer.alloc(0)),
  ])
  return new File([new Uint8Array(bytes)], "16000x16000.png", { type: "image/png" })
}

// Synthetic pixels and coordinates, never a person's photo/location.
export async function locationImage(
  format: "jpeg" | "png" | "webp",
  orientation = 1,
): Promise<File> {
  const bytes = await sharp({
    create: { width: 4, height: 3, channels: 3, background: "red" },
  })
    .withExif({
      IFD0: { ImageDescription: "SEC-004 synthetic location fixture" },
      IFD3: {
        GPSLatitudeRef: "S",
        GPSLatitude: "3/1 7/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "60/1 1/1 0/1",
      },
    })
    .withMetadata({ orientation })
    .withXmp(
      '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="3,7S" exif:GPSLongitude="60,1W"/></rdf:RDF></x:xmpmeta>',
    )
    .toFormat(format)
    .toBuffer()
  return new File([new Uint8Array(bytes)], `location.${format}`, { type: `image/${format}` })
}

export async function imageMetadata(body: unknown) {
  const bytes = body instanceof Blob ? await body.arrayBuffer() : body
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) {
    throw new Error("Expected uploaded image bytes")
  }
  const buffer =
    bytes instanceof ArrayBuffer
      ? Buffer.from(bytes)
      : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return sharp(buffer).metadata()
}

// Read the TIFF IFD0 pointer to the GPS IFD, independent of sharp's metadata decoder.
export function hasExifGps(exif: Buffer | undefined): boolean {
  if (!exif) return false
  const start = exif.subarray(0, 6).equals(Buffer.from("Exif\0\0")) ? 6 : 0
  const tiff = exif.subarray(start)
  const littleEndian = tiff.toString("ascii", 0, 2) === "II"
  const uint16 = (offset: number) =>
    littleEndian ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset)
  const uint32 = (offset: number) =>
    littleEndian ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset)
  const directory = uint32(4)
  for (let i = 0; i < uint16(directory); i++) {
    const entry = directory + 2 + i * 12
    if (uint16(entry) === 0x8825) return uint16(uint32(entry + 8)) > 0
  }
  return false
}
