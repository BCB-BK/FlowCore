import {
  useListPageTypes,
  useGetPageType,
  getGetPageTypeQueryKey,
} from "@workspace/api-client-react";

export function usePageTypes() {
  return useListPageTypes();
}

export function usePageType(templateType: string | undefined) {
  return useGetPageType(templateType ?? "", {
    query: {
      queryKey: getGetPageTypeQueryKey(templateType ?? ""),
      enabled: !!templateType,
    },
  });
}
