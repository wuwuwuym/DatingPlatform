/** Downscales an image to a square data URL so avatars need no object storage. */
export async function fileToAvatarDataUrl(file: File, size = 160): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持图片处理");
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.82);
}

/**
 * Compresses a feed image so a few of them still fit in one JSON request.
 * The loop lowers resolution/quality until the data URL is under the API cap.
 */
export async function fileToPostImageDataUrl(
  file: File,
  options: { maxSide?: number; maxLength?: number } = {},
): Promise<string> {
  const maxLength = options.maxLength ?? 360_000;
  const bitmap = await createImageBitmap(file);
  let side = options.maxSide ?? 1080;
  let quality = 0.8;
  let dataUrl = "";

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持图片处理");
      context.drawImage(bitmap, 0, 0, width, height);
      dataUrl = canvas.toDataURL("image/jpeg", quality);

      if (dataUrl.length <= maxLength) return dataUrl;
      side = Math.round(side * 0.75);
      quality = Math.max(0.5, quality - 0.1);
    }
  } finally {
    bitmap.close();
  }

  if (dataUrl.length === 0 || dataUrl.length > maxLength) {
    throw new Error("图片压缩后仍然过大，请换一张试试");
  }
  return dataUrl;
}
