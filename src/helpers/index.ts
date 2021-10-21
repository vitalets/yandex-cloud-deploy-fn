// eslint-disable-next-line @typescript-eslint/ban-types
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
export type Defaults<T> = Required<Pick<T, OptionalKeys<T>>>;

export function formatBytes(bytes: number) {
  const kb = bytes / 1024;
  const [ val, unit ] = kb < 1024 ? [ kb, 'Kb' ] : [ kb / 1024, 'Mb' ];
  return `${Number(val.toFixed(2))} ${unit}`;
}
