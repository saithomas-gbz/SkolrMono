/** Enfant actif de l'espace famille — persisté en query `?childId=` à travers les pages /parent/*. */
export function useParentChild() {
  const activeChildId = useState<string | null>('parent-active-child-id', () => null);
  const route = useRoute();
  const router = useRouter();

  if (!activeChildId.value && typeof route.query.childId === 'string') {
    activeChildId.value = route.query.childId;
  }

  function setActiveChildId(childId: string) {
    activeChildId.value = childId;
    router.replace({ query: { ...route.query, childId } });
  }

  return { activeChildId, setActiveChildId };
}
