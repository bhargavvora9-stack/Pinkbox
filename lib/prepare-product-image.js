const DEFAULT_MAX_BYTES = 3.8 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be opened in the browser.'));
    };
    image.src = url;
  });
}

function toWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Image optimization failed. Please choose another image.')),
      'image/webp',
      quality
    );
  });
}

/**
 * Keep uploads below the server request-size limit. Large JPEG/PNG/WEBP images
 * are resized and converted to WebP in the browser before they are uploaded.
 * GIFs are kept as-is so their animation is not lost.
 */
export async function prepareProductImage(file, options = {}) {
  const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : DEFAULT_MAX_BYTES;
  if (!file || typeof file.size !== 'number') throw new Error('Please choose a valid image file.');
  if (file.size <= maxBytes) return file;

  if (file.type === 'image/gif') {
    throw new Error('GIF is larger than the allowed size and cannot be optimized without losing animation. Please use a smaller GIF or a JPG/PNG/WEBP image.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Large images can be optimized only for JPG, PNG or WEBP formats.');
  }

  let source;
  let closeSource = () => {};
  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(file);
      closeSource = () => source.close();
    } else {
      source = await loadImageElement(file);
    }
  } catch {
    source = await loadImageElement(file);
  }

  try {
    const width = Number(source.width || source.naturalWidth || 0);
    const height = Number(source.height || source.naturalHeight || 0);
    if (!width || !height) throw new Error('Image dimensions could not be read.');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image optimization is not supported in this browser.');

    let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const qualities = [0.88, 0.82, 0.76, 0.70, 0.64, 0.58];

    for (const quality of qualities) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);

      const blob = await toWebpBlob(canvas, quality);
      if (blob.size <= maxBytes) {
        const baseName = String(file.name || 'product-image').replace(/\.[^.]+$/, '') || 'product-image';
        return new File([blob], baseName + '.webp', {
          type: 'image/webp',
          lastModified: file.lastModified || Date.now(),
        });
      }
      scale *= 0.84;
    }

    throw new Error('This image is still too large after optimization. Please choose a smaller image.');
  } finally {
    closeSource();
  }
}
