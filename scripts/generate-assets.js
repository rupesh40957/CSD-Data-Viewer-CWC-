const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/Rupesh/.gemini/antigravity/brain/de550657-9908-4055-9b93-e0bba4c857dc/.user_uploaded/media_1793614082395_6069feef.jpg';

// Helper to trim strictly by alpha channel (> 15)
async function trimAlpha(sharpInstance) {
  const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return sharpInstance.png().toBuffer();
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}

// Helper to write standard ICO format file from PNG buffers
function createIco(pngBuffers) {
  // ICO header: 6 bytes
  // 0-1: Reserved (0)
  // 2-3: Image type (1 for icon)
  // 4-5: Number of images
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const directoryEntries = [];
  const imageDataBuffers = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // image data offset

    directoryEntries.push(entry);
    imageDataBuffers.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageDataBuffers]);
}

async function run() {
  console.log('--- Step 1: Processing Raw Uploaded Logo ---');
  const img = sharp(srcPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  const rgbaWhiteMono = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const whiteness = Math.min(g, b);
    let alpha = 255 - whiteness;

    if (alpha < 20) {
      alpha = 0;
    } else {
      alpha = Math.min(255, Math.round(alpha * 1.08));
    }

    if (alpha > 0) {
      const aNorm = alpha / 255;
      let trueR = Math.round((r - 255 * (1 - aNorm)) / aNorm);
      let trueG = Math.round((g - 255 * (1 - aNorm)) / aNorm);
      let trueB = Math.round((b - 255 * (1 - aNorm)) / aNorm);

      trueR = Math.min(255, Math.max(190, trueR));
      trueG = Math.min(20, Math.max(0, trueG));
      trueB = Math.min(20, Math.max(0, trueB));

      rgba[i * 4] = trueR;
      rgba[i * 4 + 1] = trueG;
      rgba[i * 4 + 2] = trueB;
      rgba[i * 4 + 3] = alpha;

      // White silhouette version
      rgbaWhiteMono[i * 4] = 255;
      rgbaWhiteMono[i * 4 + 1] = 255;
      rgbaWhiteMono[i * 4 + 2] = 255;
      rgbaWhiteMono[i * 4 + 3] = alpha;
    } else {
      rgba[i * 4] = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 0;

      rgbaWhiteMono[i * 4] = 0;
      rgbaWhiteMono[i * 4 + 1] = 0;
      rgbaWhiteMono[i * 4 + 2] = 0;
      rgbaWhiteMono[i * 4 + 3] = 0;
    }
  }

  // 1. Full logo (Emblem + Text)
  const fullPngTrimmedBuf = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim()
    .toBuffer();

  const trimmedMeta = await sharp(fullPngTrimmedBuf).metadata();
  console.log('Full logo trimmed size:', trimmedMeta.width, 'x', trimmedMeta.height);

  const fullLogoUpscaled = await sharp(fullPngTrimmedBuf)
    .resize(trimmedMeta.width * 4, trimmedMeta.height * 4, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  fs.writeFileSync('public/images/logo.png', fullLogoUpscaled);
  fs.writeFileSync('public/images/csd-logo.png', fullLogoUpscaled);
  fs.writeFileSync('public/images/csd-logo-full.png', fullLogoUpscaled);
  console.log('Saved public/images/logo.png');

  // White background full logo
  const fullLogoWhiteBg = await sharp(fullLogoUpscaled)
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  fs.writeFileSync('public/images/logo-white-bg.png', fullLogoWhiteBg);
  console.log('Saved public/images/logo-white-bg.png');

  // White monochrome full logo
  const fullWhiteMonoTrimmed = await sharp(rgbaWhiteMono, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim()
    .toBuffer();
  const fullWhiteMonoUpscaled = await sharp(fullWhiteMonoTrimmed)
    .resize(trimmedMeta.width * 4, trimmedMeta.height * 4, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  fs.writeFileSync('public/images/csd-logo-white.png', fullWhiteMonoUpscaled);
  console.log('Saved public/images/csd-logo-white.png');

  // 2. Emblem only
  console.log('--- Step 2: Extracting Emblem Symbol ---');
  // Crop only the emblem part from the 4x upscaled logo:
  // The emblem is in top 310 pixels out of 405 (ratio ~0.765)
  const emblemHeight = Math.round(trimmedMeta.height * 4 * 0.765);
  const emblemExtractRaw = sharp(fullLogoUpscaled)
    .extract({ left: 0, top: 0, width: trimmedMeta.width * 4, height: emblemHeight });
  const emblemExtract = await trimAlpha(emblemExtractRaw);

  const emblemMeta = await sharp(emblemExtract).metadata();
  console.log('Trimmed Emblem size:', emblemMeta.width, 'x', emblemMeta.height);
  fs.writeFileSync('public/images/csd-emblem.png', emblemExtract);

  // White monochrome emblem
  const emblemWhiteRaw = sharp(fullWhiteMonoUpscaled)
    .extract({ left: 0, top: 0, width: trimmedMeta.width * 4, height: emblemHeight });
  const emblemWhiteExtract = await trimAlpha(emblemWhiteRaw);
  fs.writeFileSync('public/images/csd-emblem-white.png', emblemWhiteExtract);
  console.log('Saved public/images/csd-emblem-white.png');

  // 3. Favicon & App Icons (512, 180, 64, 32, 16)
  console.log('--- Step 3: Generating Favicons and App Icons ---');
  const emblemBase64 = 'data:image/png;base64,' + emblemExtract.toString('base64');

  // Calculate emblem positioning within 512x512
  // Maximum width 400, maximum height 220
  const embAspect = emblemMeta.width / emblemMeta.height;
  let targetW = 400;
  let targetH = Math.round(targetW / embAspect);
  if (targetH > 220) {
    targetH = 220;
    targetW = Math.round(targetH * embAspect);
  }
  const targetX = Math.round((512 - targetW) / 2);
  const targetY = Math.round((512 - targetH) / 2);

  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <filter id="card-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Clean rounded squircle card -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="#ffffff" stroke="#f1f5f9" stroke-width="4" filter="url(#card-shadow)"/>
  <!-- Red Brand CS Emblem -->
  <image href="${emblemBase64}" x="${targetX}" y="${targetY}" width="${targetW}" height="${targetH}" preserveAspectRatio="xMidYMid meet" />
</svg>`;

  fs.writeFileSync('public/icon.svg', svgIcon);
  fs.writeFileSync('src/app/icon.svg', svgIcon);
  fs.writeFileSync('public/images/csd-logo.svg', svgIcon);
  console.log('Saved public/icon.svg and src/app/icon.svg');

  // Also an SVG version of the full logo
  const fullBase64 = 'data:image/png;base64,' + fullLogoUpscaled.toString('base64');
  const svgFullLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${trimmedMeta.width * 4} ${trimmedMeta.height * 4}" width="100%" height="100%">
  <image href="${fullBase64}" width="${trimmedMeta.width * 4}" height="${trimmedMeta.height * 4}" />
</svg>`;
  fs.writeFileSync('public/images/logo.svg', svgFullLogo);

  // Generate PNG favicons
  const png512 = await sharp(Buffer.from(svgIcon)).resize(512, 512).png().toBuffer();
  fs.writeFileSync('public/icon.png', png512);
  fs.writeFileSync('src/app/icon.png', png512);

  const png180 = await sharp(Buffer.from(svgIcon)).resize(180, 180).png().toBuffer();
  fs.writeFileSync('public/apple-icon.png', png180);
  fs.writeFileSync('src/app/apple-icon.png', png180);

  const png64 = await sharp(Buffer.from(svgIcon)).resize(64, 64).png().toBuffer();
  const png48 = await sharp(Buffer.from(svgIcon)).resize(48, 48).png().toBuffer();
  const png32 = await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toBuffer();
  const png16 = await sharp(Buffer.from(svgIcon)).resize(16, 16).png().toBuffer();

  // Create favicon.ico containing 16x16, 32x32, 48x48
  const icoBuffer = createIco([
    { buffer: png16, size: 16 },
    { buffer: png32, size: 32 },
    { buffer: png48, size: 48 },
  ]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);
  console.log('Saved public/favicon.ico and src/app/favicon.ico');

  console.log('Asset generation complete!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
