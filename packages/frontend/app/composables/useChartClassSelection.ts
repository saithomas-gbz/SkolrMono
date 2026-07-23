import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

type ChartClassOption = {
  label: string;
  value: string;
};

type UseChartClassSelectionOptions = {
  /** Pré-sélection — ex. depuis `?classId=` sur `/dashboard`. */
  initialClassId?: MaybeRefOrGetter<string | undefined>;
};

/**
 * Résolution pure de la classe sélectionnée à partir de la liste courante.
 * Priorité : classe préférée (prop / `?classId=`) si présente → sélection
 * courante si encore valide → 1ʳᵉ classe. Liste vide → aucune sélection.
 * Extraite pour être testable sans monter le composable (cf. bug widget #B4).
 */
export function resolveSelectedClassId(
  classes: Pick<SkolrClassSummary, 'id'>[],
  current: string | null,
  preferred: string | null,
): string | null {
  if (classes.length === 0) {
    return null;
  }
  if (preferred && classes.some((c) => c.id === preferred)) {
    return preferred;
  }
  const stillValid = classes.some((c) => c.id === current);
  if (!current || !stillValid) {
    return classes[0].id;
  }
  return current;
}

/**
 * Sélection de classe partagée pour les graphiques du dashboard :
 * résolution prop / `?classId=`, fallback sur la 1ère classe, sync URL.
 */
export async function useChartClassSelection(options: UseChartClassSelectionOptions = {}) {
  const route = useRoute();
  const router = useRouter();
  const api = useApi();

  function resolveInitialClassId(): string | null {
    const fromProp = toValue(options.initialClassId)?.trim();
    if (fromProp) {
      return fromProp;
    }
    const q = route.query.classId;
    if (typeof q === 'string' && q.trim()) {
      return q.trim();
    }
    return null;
  }

  const selectedClassId = ref<string | null>(resolveInitialClassId());

  const {
    data: summaryResponse,
    pending: listPending,
    error: listError,
    refresh: refreshSummary,
  } = await useFetch<ClassesSummaryApiResponse>('/class/classes/summary', {
    $fetch: api,
    default: () => ({ data: [] as SkolrClassSummary[], message: '' }),
  });

  const classSummaries = computed(() => summaryResponse.value?.data ?? []);

  const classOptions = computed<ChartClassOption[]>(() =>
    classSummaries.value.map((c) => ({ label: c.name, value: c.id })),
  );

  function syncSelectedFromSummary(list: SkolrClassSummary[]) {
    selectedClassId.value = resolveSelectedClassId(
      list,
      selectedClassId.value,
      resolveInitialClassId(),
    );
  }

  syncSelectedFromSummary(classSummaries.value);

  watch(classSummaries, syncSelectedFromSummary);

  watch(selectedClassId, (id) => {
    if (import.meta.server) {
      return;
    }
    const current = typeof route.query.classId === 'string' ? route.query.classId : null;
    if (id === current) {
      return;
    }
    const nextQuery = { ...route.query };
    if (id) {
      nextQuery.classId = id;
    } else {
      delete nextQuery.classId;
    }
    router.replace({ query: nextQuery });
  });

  const listFetchError = computed(() =>
    listError.value ? normalizeApiError(listError.value) : null,
  );

  return {
    selectedClassId,
    classSummaries,
    classOptions,
    summaryResponse,
    listPending,
    listError,
    listFetchError,
    refreshSummary,
    resolveInitialClassId,
  };
}
