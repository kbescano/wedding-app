import * as migration_20260921_131556_initial from './20260921_131556_initial';
import * as migration_20260922_030521_add_photos_object_key from './20260922_030521_add_photos_object_key';

export const migrations = [
  {
    up: migration_20260921_131556_initial.up,
    down: migration_20260921_131556_initial.down,
    name: '20260921_131556_initial',
  },
  {
    up: migration_20260922_030521_add_photos_object_key.up,
    down: migration_20260922_030521_add_photos_object_key.down,
    name: '20260922_030521_add_photos_object_key'
  },
];
