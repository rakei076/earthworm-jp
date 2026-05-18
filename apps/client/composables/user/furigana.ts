import { useLocalStorage } from "@vueuse/core";

const STORAGE_KEY = "show-furigana";

export function useShowFurigana() {
  const showFurigana = useLocalStorage<boolean>(STORAGE_KEY, true);

  function toggleShowFurigana() {
    showFurigana.value = !showFurigana.value;
  }

  return {
    showFurigana,
    toggleShowFurigana,
  };
}
