import { useQueryClient } from "@tanstack/react-query";
import {
  useListRootNodes,
  useGetNode,
  useGetNodeChildren,
  useGetNodeAncestors,
  useGetNodeSiblings,
  useListNodes,
  useListNodeRevisions,
  useCreateNode as useCreateNodeMutation,
  useDeleteNode as useDeleteNodeMutation,
  useUpdateNode as useUpdateNodeMutation,
  useCreateRevision as useCreateRevisionMutation,
  getListRootNodesQueryKey,
  getGetNodeQueryKey,
  getGetNodeChildrenQueryKey,
  getGetNodeAncestorsQueryKey,
  getGetNodeSiblingsQueryKey,
  getListNodesQueryKey,
  getListNodeRevisionsQueryKey,
} from "@workspace/api-client-react";

export function useRootNodes() {
  return useListRootNodes();
}

export function useNodeChildren(nodeId: string | undefined) {
  return useGetNodeChildren(nodeId ?? "", {
    query: {
      queryKey: getGetNodeChildrenQueryKey(nodeId ?? ""),
      enabled: !!nodeId,
    },
  });
}

export function useNode(nodeId: string | undefined) {
  return useGetNode(nodeId ?? "", {
    query: {
      queryKey: getGetNodeQueryKey(nodeId ?? ""),
      enabled: !!nodeId,
    },
  });
}

export function useAllNodes() {
  return useListNodes();
}

export function useNodeAncestors(nodeId: string | undefined) {
  return useGetNodeAncestors(nodeId ?? "", {
    query: {
      queryKey: getGetNodeAncestorsQueryKey(nodeId ?? ""),
      enabled: !!nodeId,
    },
  });
}

export function useNodeRevisions(nodeId: string | undefined) {
  return useListNodeRevisions(nodeId ?? "", {
    query: {
      queryKey: getListNodeRevisionsQueryKey(nodeId ?? ""),
      enabled: !!nodeId,
    },
  });
}

export function useNodeSiblings(nodeId: string | undefined) {
  return useGetNodeSiblings(nodeId ?? "", {
    query: {
      queryKey: getGetNodeSiblingsQueryKey(nodeId ?? ""),
      enabled: !!nodeId,
    },
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useCreateNodeMutation({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: getListRootNodesQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListNodesQueryKey(),
        });
        if (variables.data.parentNodeId) {
          queryClient.invalidateQueries({
            queryKey: getGetNodeChildrenQueryKey(variables.data.parentNodeId),
          });
          const parentNode = queryClient
            .getQueriesData<import("@workspace/api-client-react").ContentNode>({
              queryKey: getGetNodeQueryKey(variables.data.parentNodeId),
            })
            .flatMap(([, data]) => (data ? [data] : []))[0];
          if (parentNode?.parentNodeId) {
            queryClient.invalidateQueries({
              queryKey: getGetNodeChildrenQueryKey(parentNode.parentNodeId),
            });
          }
        }
      },
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useDeleteNodeMutation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListRootNodesQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListNodesQueryKey(),
        });
      },
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useUpdateNodeMutation({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: getGetNodeQueryKey(variables.nodeId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNodeChildrenQueryKey(variables.nodeId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNodeAncestorsQueryKey(variables.nodeId),
        });
        queryClient.invalidateQueries({
          queryKey: getListRootNodesQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListNodesQueryKey(),
        });
      },
    },
  });
}

export function useCreateRevision() {
  const queryClient = useQueryClient();
  return useCreateRevisionMutation({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: getListNodeRevisionsQueryKey(variables.nodeId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNodeQueryKey(variables.nodeId),
        });
      },
    },
  });
}
