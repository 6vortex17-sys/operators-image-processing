const input = document.getElementById("imageInput");
const sampleBtn = document.getElementById("sampleBtn");
const statusEl = document.getElementById("status");

const canvases = {
  original: document.getElementById("originalCanvas"),
  gray: document.getElementById("grayCanvas"),
  sobel: document.getElementById("sobelCanvas"),
  prewitt: document.getElementById("prewittCanvas"),
  laplacian: document.getElementById("laplacianCanvas")
};

function setStatus(text) {
  statusEl.textContent = text;
}

function fitSize(width, height, max = 720) {
  const scale = Math.min(1, max / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

function drawToCanvas(canvas, pixels, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
}

function grayscale(data, width, height) {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return out;
}

function normalize(values) {
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const out = new Uint8ClampedArray(values.length);
  for (let i = 0; i < values.length; i++) out[i] = Math.round(((values[i] - min) / range) * 255);
  return out;
}

function convolve(gray, width, height, kernel) {
  const out = new Float64Array(width * height);
  const k = 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -k; ky <= k; ky++) {
        for (let kx = -k; kx <= k; kx++) {
          const sx = Math.min(width - 1, Math.max(0, x + kx));
          const sy = Math.min(height - 1, Math.max(0, y + ky));
          sum += gray[sy * width + sx] * kernel[ky + 1][kx + 1];
        }
      }
      out[y * width + x] = sum;
    }
  }
  return out;
}

function magnitude(a, b) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = Math.sqrt(a[i] * a[i] + b[i] * b[i]);
  return normalize(out);
}

function toRGBA(grayPixels) {
  const rgba = new Uint8ClampedArray(grayPixels.length * 4);
  for (let i = 0, p = 0; i < grayPixels.length; i++, p += 4) {
    const v = grayPixels[i];
    rgba[p] = v; rgba[p + 1] = v; rgba[p + 2] = v; rgba[p + 3] = 255;
  }
  return rgba;
}

function renderImage(img) {
  const [width, height] = fitSize(img.naturalWidth, img.naturalHeight);
  const temp = document.createElement("canvas");
  temp.width = width; temp.height = height;
  const ctx = temp.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;

  drawToCanvas(canvases.original, rgba, width, height);

  const gray = grayscale(rgba, width, height);
  drawToCanvas(canvases.gray, toRGBA(gray), width, height);

  const sobelX = convolve(gray, width, height, [
    [-1, 0, 1], [-2, 0, 2], [-1, 0, 1]
  ]);
  const sobelY = convolve(gray, width, height, [
    [-1, -2, -1], [0, 0, 0], [1, 2, 1]
  ]);
  const sobel = magnitude(sobelX, sobelY);
  drawToCanvas(canvases.sobel, toRGBA(sobel), width, height);

  const prewittX = convolve(gray, width, height, [
    [-1, 0, 1], [-1, 0, 1], [-1, 0, 1]
  ]);
  const prewittY = convolve(gray, width, height, [
    [-1, -1, -1], [0, 0, 0], [1, 1, 1]
  ]);
  const prewitt = magnitude(prewittX, prewittY);
  drawToCanvas(canvases.prewitt, toRGBA(prewitt), width, height);

  const lap = convolve(gray, width, height, [
    [0, 1, 0], [1, -4, 1], [0, 1, 0]
  ]).map ? null : null;

  const lapValues = convolve(gray, width, height, [
    [0, 1, 0], [1, -4, 1], [0, 1, 0]
  ]);
  for (let i = 0; i < lapValues.length; i++) lapValues[i] = Math.abs(lapValues[i]);
  const laplacian = normalize(lapValues);
  drawToCanvas(canvases.laplacian, toRGBA(laplacian), width, height);

  setStatus(`Processed ${img.naturalWidth} × ${img.naturalHeight} pixels • Sobel • Prewitt • Laplacian`);
}

function loadFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Please choose an image file.");
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    renderImage(img);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => setStatus("Could not read this image.");
  img.src = url;
}

input.addEventListener("change", e => loadFile(e.target.files[0]));

sampleBtn.addEventListener("click", () => {
  const c = document.createElement("canvas");
  c.width = 720; c.height = 480;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ddd8ce";
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.fillStyle = "#202020";
  ctx.fillRect(90, 80, 540, 320);
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(260, 235, 105, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff5a36";
  ctx.fillRect(400, 145, 125, 180);
  ctx.fillStyle = "#1e6b4d";
  ctx.beginPath();
  ctx.moveTo(540, 360);
  ctx.lineTo(450, 220);
  ctx.lineTo(350, 360);
  ctx.closePath();
  ctx.fill();

  const img = new Image();
  img.onload = () => renderImage(img);
  img.src = c.toDataURL("image/png");
});

setStatus("Choose an image or use the sample to start.");
