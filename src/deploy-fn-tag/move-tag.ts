/**
 * Move single tag (with history tags).
 */
import { logger } from '../utils/logger';
import { Tag } from './tags-manager';
import { Version, VersionsManager } from './versions-manager';
import { runCmd } from '../utils/run-cmd';

export class MoveTag {
  curVersion?: Version;
  isRollback = false;

  constructor(private tag: Tag, private newVersion: Version, private versionsManager: VersionsManager) { }

  /**
   * Move main tag and history tags one-by-one.
   */
   async run() {
    await this.moveMainTag();
    if (this.curVersion && !this.isRollback) {
      await this.moveHistoryTags();
    }
    this.logDone();
  }

  private async moveMainTag() {
    const { name } = this.tag;
    this.curVersion = this.versionsManager.findByTag(name);
    if (this.curVersion?.id === this.newVersion.id) {
      logger.log(`Tag "${name}" already on version: ${this.newVersion.id}`);
      return;
    }
    this.runCmdPre();
    this.setIsRollback();
    await this.versionsManager.setTag(this.newVersion, name);
    // todo: cmdPost
  }

  private async moveHistoryTags() {
    const { historyTags } = this.tag;
    let newVersion = this.curVersion!;
    for (const tag of historyTags) {
      const curVersion = this.versionsManager.findByTag(tag);
      if (curVersion?.id === newVersion.id) break;
      await this.versionsManager.setTag(newVersion, tag);
      if (!curVersion) break;
      newVersion = curVersion;
    }
  }

  private runCmdPre() {
    const { cmdPre, name } = this.tag;
    if (cmdPre) {
      runCmd(cmdPre, { tag: name });
    }
  }

  private setIsRollback() {
    this.isRollback = this.newVersion.tags.some(name => this.tag.historyTags.includes(name));
    logger.debug(`isRollback: ${this.isRollback}`);
  }

  private logDone() {
    logger.log(`Set tag "${this.tag.name}" to version: ${this.newVersion.id}`);
  }
}
