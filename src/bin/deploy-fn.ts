#!/usr/bin/env node
import { getConfig } from './yargs';
import { DeployFn } from '../deploy-fn';

main();

async function main() {
  const config = await getConfig();
  await new DeployFn(config).run();
}
