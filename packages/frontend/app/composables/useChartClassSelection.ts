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
    if (list.length === 0) {
      selectedClassId.value = null;
      return;
    }
    const preferred = resolveInitialClassId();
    const stillValid = list.some((c) => c.id === selectedClassId.value);
    if (preferred && list.some((c) => c.id === preferred)) {
      selectedClassId.value = preferred;
      return;
    }
    if (!selectedClassId.value || !stillValid) {
      selectedClassId.value = list[0].id;
    }
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
