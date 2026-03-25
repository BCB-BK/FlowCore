import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, queryClient } from "@/lib/api";
import type { ContentNode } from "@/lib/types";

export function useRootNodes() {
  return useQuery<ContentNode[]>({
    queryKey: ["nodes", "roots"],
    queryFn: () => apiFetch<ContentNode[]>("/content/nodes/roots"),
  });
}

export function useNodeChildren(nodeId: string | undefined) {
  return useQuery<ContentNode[]>({
    queryKey: ["nodes", nodeId, "children"],
    queryFn: () => apiFetch<ContentNode[]>(`/content/nodes/${nodeId}/children`),
    enabled: !!nodeId,
  });
}

export function useNode(nodeId: string | undefined) {
  return useQuery<ContentNode>({
    queryKey: ["nodes", nodeId],
    queryFn: () => apiFetch<ContentNode>(`/content/nodes/${nodeId}`),
    enabled: !!nodeId,
  });
}

export function useAllNodes() {
  return useQuery<ContentNode[]>({
    queryKey: ["nodes", "all"],
    queryFn: () => apiFetch<ContentNode[]>("/content/nodes"),
  });
}

export function useCreateNode() {
  return useMutation({
    mutationFn: (data: {
      title: string;
      templateType: string;
      parentNodeId?: string | null;
    }) =>
      apiFetch<ContentNode>("/content/nodes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useDeleteNode() {
  return useMutation({
    mutationFn: (nodeId: string) =>
      apiFetch(`/content/nodes/${nodeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useNodeAncestors(nodeId: string | undefined) {
  return useQuery<ContentNode[]>({
    queryKey: ["nodes", nodeId, "ancestors"],
    queryFn: () =>
      apiFetch<ContentNode[]>(`/content/nodes/${nodeId}/ancestors`),
    enabled: !!nodeId,
  });
}
