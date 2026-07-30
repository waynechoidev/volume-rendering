import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [inputDirectory, outputPath] = process.argv.slice(2);

if (!inputDirectory || !outputPath) {
  throw new Error(
    "Usage: node scripts/convert-cthead-tiff.mjs <TIFF directory> <output.raw>",
  );
}

const files = (await readdir(inputDirectory))
  .filter((file) => /^cthead-16bit\d+\.tif$/i.test(file))
  .sort();

if (files.length === 0) {
  throw new Error(`No CThead 16-bit TIFF slices found in ${inputDirectory}`);
}

const WIDTH = 256;
const HEIGHT = 256;
const pixelsPerSlice = WIDTH * HEIGHT;
const output = Buffer.allocUnsafe(pixelsPerSlice * files.length * 2);
let minimum = 0xffff;
let maximum = 0;

for (const [sliceIndex, file] of files.entries()) {
  const tiff = await readFile(path.join(inputDirectory, file));
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const byteOrder = tiff.toString("ascii", 0, 2);
  const littleEndian = byteOrder === "II";

  if (!littleEndian && byteOrder !== "MM") {
    throw new Error(`${file}: unsupported TIFF byte order ${byteOrder}`);
  }

  const uint16 = (offset) => view.getUint16(offset, littleEndian);
  const uint32 = (offset) => view.getUint32(offset, littleEndian);
  const ifdOffset = uint32(4);
  const entryCount = uint16(ifdOffset);
  const tags = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const tag = uint16(entryOffset);
    const type = uint16(entryOffset + 2);
    const count = uint32(entryOffset + 4);
    const valueOffset = entryOffset + 8;
    const value =
      type === 3 && count === 1
        ? uint16(valueOffset)
        : uint32(valueOffset);
    tags.set(tag, value);
  }

  const width = tags.get(256);
  const height = tags.get(257);
  const bitsPerSample = tags.get(258);
  const compression = tags.get(259) ?? 1;
  const stripOffset = tags.get(273);
  const stripByteCount = tags.get(279);

  if (
    width !== WIDTH ||
    height !== HEIGHT ||
    bitsPerSample !== 16 ||
    compression !== 1 ||
    stripByteCount !== pixelsPerSlice * 2
  ) {
    throw new Error(`${file}: unexpected TIFF layout`);
  }

  for (let pixelIndex = 0; pixelIndex < pixelsPerSlice; pixelIndex += 1) {
    const value = view.getUint16(stripOffset + pixelIndex * 2, littleEndian);
    const outputOffset =
      (sliceIndex * pixelsPerSlice + pixelIndex) * 2;
    output.writeUInt16LE(value, outputOffset);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
}

await writeFile(outputPath, output);
console.log(
  `Wrote ${files.length} × ${WIDTH} × ${HEIGHT} uint16 voxels ` +
    `(${output.byteLength} bytes, range ${minimum}…${maximum}) to ${outputPath}`,
);
