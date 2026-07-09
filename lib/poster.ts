import fs from 'fs';
import path from 'path';

async function loadFont(name: string, file: string): Promise<{ name: string; data: Buffer; style: string }> {
  const fontPath = path.join(process.cwd(), 'fonts', file);
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Font not found: ${fontPath}`);
  }
  return {
    name,
    data: fs.readFileSync(fontPath),
    style: 'normal',
  };
}

export async function renderPosterPNG(
  posterHTML: string,
  qrDataURL: string
): Promise<Buffer> {
  // For MVP: embed QR code into the HTML and use the HTML directly
  // satori approach requires JSX conversion — keeping it simpler:
  // Just return the HTML as-is and let the client handle image generation

  // Inject QR code into the HTML poster
  const qrSection = `
    <div class="qr-section" style="position:absolute;bottom:30px;right:30px;text-align:center;">
      <img src="${qrDataURL}" width="100" height="100" alt="QR" />
      <p style="font-size:10px;color:#666;margin-top:4px;">Scan for full reading</p>
    </div>`;

  // Insert QR before closing body
  const htmlWithQR = posterHTML.replace('</body>', qrSection + '\n</body>');

  return Buffer.from(htmlWithQR, 'utf-8');
}

// For server-side PNG export using satori
export async function renderPosterPNGServer(
  chartData: any,
  analysisData: any,
  qrDataURL: string,
  baseUrl: string
): Promise<Buffer> {
  // Simplified: use the existing render.js HTML template approach
  // which already produces a self-contained HTML poster
  // For PNG, we return the HTML and use client-side html-to-image

  // The actual PNG rendering will happen client-side with html2canvas
  // or we can use puppeteer server-side in production

  // For now, return a placeholder that signals client-side rendering
  return Buffer.from('CLIENT_SIDE_RENDER', 'utf-8');
}
