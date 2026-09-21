import * as migration_20260921_131556_initial from './20260921_131556_initial';

export const migrations = [
  {
    up: migration_20260921_131556_initial.up,
    down: migration_20260921_131556_initial.down,
    name: '20260921_131556_initial'
  },
];
