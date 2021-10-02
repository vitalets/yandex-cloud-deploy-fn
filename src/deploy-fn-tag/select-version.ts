import inquirer from 'inquirer';
import { Version, formatVersion } from './versions-manager';

export async function selectVersion(versions: Version[], functionName: string) {
  const choices = versions.map(version => {
    return {
      name: formatVersion(version),
      value: version,
    };
  });
  const { version } = await inquirer.prompt([{
    type: 'list',
    name: 'version',
    message: `Select version of "${functionName}":`,
    choices
  }]);
  return version as Version;
}
