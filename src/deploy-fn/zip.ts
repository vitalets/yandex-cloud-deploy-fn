/**
 * Creating zip.
 */
import path from 'path';
import fg from 'fast-glob';
import AdmZip from 'adm-zip';
import { logger } from '../helpers/logger';
import { Config } from '../config';

export class Zip {
  zip: AdmZip;

  constructor(private deployConfig: NonNullable<Config['deploy']>) {
    this.zip = new AdmZip();
  }

  async create() {
    await this.archiveFiles();
    this.assertHandlerExists();
    this.removeDevDependencies();
  }

  toBuffer() {
    return this.zip.toBuffer();
  }

  private async archiveFiles() {
    logger.log(`Creating zip...`);
    const files = await fg(this.deployConfig.files, { dot: true });
    files.forEach(file => this.zip.addLocalFile(file, path.dirname(file)));
  }

  private removeDevDependencies() {
    const pkgEntry = this.zip.getEntries().find(entry => entry.name === 'package.json');
    if (pkgEntry) {
      logger.log(`Removing devDependencies (${pkgEntry.entryName})...`);
      const pkgContent = this.zip.readAsText(pkgEntry);
      const pkg = JSON.parse(pkgContent);
      delete pkg.devDependencies;
      this.zip.updateFile(pkgEntry, Buffer.from(JSON.stringify(pkg, null, 2)));
    }
  }

  private assertHandlerExists() {
    const { handler } = this.deployConfig;
    // dist/index.handler -> dist/index.js
    const handlerFileName = handler.split('.').slice(0, -1).concat([ 'js' ]).join('.');
    const handlerEntry = this.zip.getEntries().find(entry => entry.entryName === handlerFileName);
    if (!handlerEntry) throw new Error(`Handler file not found in zip: ${handler}`);
  }
}
