/**
 * Creating zip.
 */
import path from 'path';
import fg from 'fast-glob';
import AdmZip from 'adm-zip';
import { Config } from '../config';

export class Zip {
  zip: AdmZip;

  constructor(private config: Config) {
    this.zip = new AdmZip();
  }

  get deployConfig() {
    return this.config.deploy!;
  }

  async create() {
    await this.archiveFiles();
    this.extractToZipDirIfNeeded();
    this.assertHandlerExists();
  }

  toBuffer() {
    return this.zip.toBuffer();
  }

  private async archiveFiles() {
    for (const pattern of this.deployConfig.files) {
      if (typeof pattern === 'string') {
        const files = await fg(pattern, { dot: true });
        files.forEach(file => this.zip.addLocalFile(file, path.dirname(file)));
      } else {
        const { src, zip } = pattern;
        this.zip.addLocalFile(src, path.dirname(zip), path.basename(zip));
      }
    }
  }

  private extractToZipDirIfNeeded() {
    if (this.config.zipDir) {
      this.zip.extractAllTo(this.config.zipDir, true);
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
