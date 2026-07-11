export type PageHeader = {
  title: string;
  subtitle?: string;
};

/**
 * Shared TopBar title/subtitle state. Pages set it (e.g. in a `watchEffect`
 * so it stays in sync with fetched data); `layouts/default.vue` renders it
 * via `components/shell/TopBar.vue`. Each page's `setup()` re-runs on
 * navigation, so setting it unconditionally on mount avoids stale titles
 * leaking from the previous route.
 */
export function usePageHeader() {
  const header = useState<PageHeader>('shell-page-header', () => ({ title: '' }));

  function setPageHeader(next: PageHeader) {
    header.value = next;
  }

  return { header, setPageHeader };
}
