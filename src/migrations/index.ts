import * as migration_20260820_211303_initial_schema from './20260820_211303_initial_schema'
import * as migration_20260910_004105_icaia_2027_content from './20260910_004105_icaia_2027_content'
import * as migration_20260910_145907_icaia_2027_provisional_date from './20260910_145907_icaia_2027_provisional_date'

export const migrations = [
  {
    up: migration_20260820_211303_initial_schema.up,
    down: migration_20260820_211303_initial_schema.down,
    name: '20260820_211303_initial_schema',
  },
  {
    up: migration_20260910_004105_icaia_2027_content.up,
    down: migration_20260910_004105_icaia_2027_content.down,
    name: '20260910_004105_icaia_2027_content',
  },
  {
    up: migration_20260910_145907_icaia_2027_provisional_date.up,
    down: migration_20260910_145907_icaia_2027_provisional_date.down,
    name: '20260910_145907_icaia_2027_provisional_date',
  },
]
