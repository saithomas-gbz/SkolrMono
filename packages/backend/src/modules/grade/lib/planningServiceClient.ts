import { schoolYearBounds as planningSchoolYearBounds } from '../../planning/service';

/**
 * Appel intra-process au module planning, sur le modèle de `classServiceClient`
 * et `parentServiceClient`. Isole la dépendance pour que les contrôleurs et
 * leurs tests n'aient qu'un seul point à simuler.
 */

/** Bornes de l'année scolaire, dérivées des séances planifiées (#254). */
export async function schoolYearBounds(): Promise<{ start: Date; end: Date } | null> {
  return planningSchoolYearBounds();
}
