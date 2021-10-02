/**
 * Move single tag or group of tags.
 */
import { selectVersion } from './select-version';
import { selectTag } from './select-tag';
import { TagsManager, Tag, isGroupTag } from './tags-manager';
import { VersionsManager, Version, formatVersion } from './versions-manager';
import { logger } from '../utils/logger';
import { Config } from '../config';
import { MoveTag } from './move-tag';

export class DeployFnTag {
  versionsManager: VersionsManager;
  tagsManager: TagsManager;
  selectedVersion!: Version;
  selectedTag!: Tag;

  constructor(private config: Config) {
    this.tagsManager = new TagsManager(config);
    this.versionsManager = new VersionsManager(config, this.tagsManager.getFilteringTagNames());
  }

  async run() {
    await this.selectVersion();
    await this.selectTag();
    await this.moveTags();
    await this.showVersions();
    logger.log(`Done.`);
  }

  async selectVersion() {
    await this.versionsManager.load();
    this.selectedVersion = await selectVersion(
      this.versionsManager.items,
      this.config.functionName,
    );
  }

  async selectTag() {
    this.selectedTag = await selectTag(this.tagsManager.items);
  }

  async moveTags() {
    const tags = isGroupTag(this.selectedTag)
      ? this.selectedTag.tags.map(name => this.tagsManager.getTag(name))
      : [ this.selectedTag ];
    for (const tag of tags) {
      await new MoveTag(tag, this.selectedVersion, this.versionsManager).run();
    }
  }

  async showVersions() {
    await this.versionsManager.load();
    this.versionsManager.items.forEach(version => logger.log(formatVersion(version)));
  }
}

