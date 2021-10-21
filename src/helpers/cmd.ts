import { spawnSync } from 'child_process';
import { logger } from './logger';

/**
 * Execute cmd. Vars will be replaced in cmd before exec.
 */
export function runCmd(cmd: string, vars: Record<string, string>) {
  Object.keys(vars).forEach(k => cmd = cmd.replace(`{${k}}`, vars[k]));
  logger.log(`Running cmd: ${cmd}`);
  const { status } = spawnSync(cmd, [], { shell: true, stdio: 'inherit' });
  if (status) throw new Error(`Error during cmd: ${status}`);
}
