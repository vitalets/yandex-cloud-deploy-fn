/**
 * Tags manager.
 */

import { Config } from '../config';

const LATEST_TAG = '$latest';
const HISTORY = 2;

export interface Tag {
  /** Tag name */
  name: string;
  /** History tags, e.g. tag-1, tag-2 */
  historyTags: string[];
  /** Command to run before tag move. '{tag}' is replaced with 1st tag of version to move on. */
  cmdPre?: string;
  /** Tag names in group tag */
  tags?: string[];
}

export type TagConfig = Pick<Tag, 'name' | 'cmdPre' | 'tags'> & {
  /** Number of history tags */
  history?: number;
}

export class TagsManager {
  items: Tag[] = [];

  constructor(private config: Config) {
    this.init();
  }

  /**
   * Список тегов для фильтрации версий для отображения.
   */
  getFilteringTagNames() {
    return this.items
      .filter(tag => !isGroupTag(tag))
      .map(({ name, historyTags }) => [ name, ...historyTags ])
      .flat()
      .concat([ LATEST_TAG ]);
  }

  getTag(name: string) {
    const tag = this.items.find(tag => tag.name === name);
    if (!tag) throw new Error(`Unknown tag name: ${name}`);
    return tag;
  }

  private init() {
    if (!this.config.tags) throw new Error(`Empty config.tags`);
    this.config.tags.map(tagConfig => {
      if (typeof tagConfig === 'string') tagConfig = { name: tagConfig };
      const { name, cmdPre, history, tags } = tagConfig;
      const historyTags = isGroupTag(tagConfig) ? [] : this.buildHistoryTags(name, history);
      this.items.push({ name, cmdPre, historyTags, tags });
    });
  }

  private buildHistoryTags(name: string, history?: number) {
    if (history === undefined) history = HISTORY;
    return new Array(history).fill(null).map((_, i) => `${name}-${i + 1}`);
  }
}

export function isGroupTag<T extends Tag | TagConfig>(tagConfig: T): tagConfig is T & { tags: string[] } {
  return Boolean(tagConfig?.tags);
}
