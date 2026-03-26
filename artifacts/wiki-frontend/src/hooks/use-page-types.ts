import {
  useListPageTypes,
  useGetPageType,
  getGetPageTypeQueryKey,
} from "@workspace/api-client-react";
import { useMemo } from "react";
import {
  validateForPublication,
  validateForDraft,
  getGuidedSections,
  getPublicationReadiness,
  getFieldsByRequirement,
  getSectionsByRequirement,
  type ValidationResult,
} from "@/lib/types";

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

export function usePublicationValidation(
  templateType: string | undefined,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
): ValidationResult | null {
  return useMemo(() => {
    if (!templateType) return null;
    return validateForPublication(templateType, metadata, sectionData);
  }, [templateType, metadata, sectionData]);
}

export function useDraftValidation(
  templateType: string | undefined,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
): ValidationResult | null {
  return useMemo(() => {
    if (!templateType) return null;
    return validateForDraft(templateType, metadata, sectionData);
  }, [templateType, metadata, sectionData]);
}

export function useGuidedSections(templateType: string | undefined) {
  return useMemo(() => {
    if (!templateType) return [];
    return getGuidedSections(templateType);
  }, [templateType]);
}

export function usePublicationReadiness(
  templateType: string | undefined,
  metadata: Record<string, unknown>,
  sectionData: Record<string, unknown>,
) {
  return useMemo(() => {
    if (!templateType) return { ready: false, percentage: 0, missingRequired: [], missingRecommended: [] };
    return getPublicationReadiness(templateType, metadata, sectionData);
  }, [templateType, metadata, sectionData]);
}

export function useFieldsByRequirement(templateType: string | undefined) {
  return useMemo(() => {
    if (!templateType) return { required: [], recommended: [], conditional: [] };
    return getFieldsByRequirement(templateType);
  }, [templateType]);
}

export function useSectionsByRequirement(templateType: string | undefined) {
  return useMemo(() => {
    if (!templateType) return { required: [], recommended: [], conditional: [] };
    return getSectionsByRequirement(templateType);
  }, [templateType]);
}
