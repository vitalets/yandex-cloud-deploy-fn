#!/usr/bin/env node
import { getConfig } from './yargs';
import { DeployFnTag } from '../deploy-fn-tag';

main();

async function main() {
  const config = await getConfig();
  await new DeployFnTag(config).run();
}
