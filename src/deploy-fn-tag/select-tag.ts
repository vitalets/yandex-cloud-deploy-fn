import inquirer from 'inquirer';
import { Tag } from './tags-manager';

export async function selectTag(tags: Tag[]) {
  const choices = tags.map(tag => {
    return {
      name: tag.name,
      value: tag,
    };
  });
  const { tag } = await inquirer.prompt([{
    type: 'list',
    name: 'tag',
    message: `Select tag:`,
    choices,
  }]);
  return tag as Tag;
}
