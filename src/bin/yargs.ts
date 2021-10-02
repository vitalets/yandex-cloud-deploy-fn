import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfigFromFile } from '../config';

const options = yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to config file',
    default: './deploy.config.js',
  })
  .parseSync();

export async function getConfig() {
  return loadConfigFromFile(options.config);
}
