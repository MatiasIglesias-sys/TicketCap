import { campeonDelSiglo }  from './configs/campeon-del-siglo';
import { centenario }       from './configs/centenario';
import { palacioPernarol }  from './configs/palacio-penarol';
import {
  franzini, granParqueCentral, jardinesHipodromo,
  charrua, burgueMiguel, marioSobrero, saroldi, genericOval,
} from './configs/tier2';
import type { StadiumConfig } from './types';

const REGISTRY: Record<string, StadiumConfig> = {
  'campeon-del-siglo':   campeonDelSiglo,
  'centenario':          centenario,
  'palacio-penarol':     palacioPernarol,
  'franzini':            franzini,
  'gran-parque-central': granParqueCentral,
  'jardines-hipodromo':  jardinesHipodromo,
  'charrua':             charrua,
  'burgue-miguel':       burgueMiguel,
  'mario-sobrero':       marioSobrero,
  'saroldi':             saroldi,
  'generic-oval':        genericOval,
};

export function getStadiumConfig(id: string): StadiumConfig {
  return REGISTRY[id] ?? genericOval;
}

export function listStadiums(): StadiumConfig[] {
  return Object.values(REGISTRY);
}
