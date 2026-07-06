import QRCode from 'qrcode';

export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });
}
