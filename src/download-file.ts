import { existsSync } from 'fs';
import { join } from 'path';

export const INSTALLER_DOWNLOAD_NAME = 'PJ-Electron-Setup-1.0.0.exe.zip';

export function installerFilePath(): string | null {
  const candidates = [
    join(process.cwd(), 'public', 'downloads', INSTALLER_DOWNLOAD_NAME),
    join(process.cwd(), 'products', 'PJ-Electron Setup 1.0.0.exe.zip'),
    join(__dirname, '..', 'public', 'downloads', INSTALLER_DOWNLOAD_NAME),
    join(__dirname, '..', '..', 'public', 'downloads', INSTALLER_DOWNLOAD_NAME),
  ];
  return candidates.find((file) => existsSync(file)) ?? null;
}
