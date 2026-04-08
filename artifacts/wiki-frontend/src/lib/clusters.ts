export interface Cluster {
  id: string;
  title: string;
  sortOrder: number;
  childNodeIds: string[];
}

export function parseClusters(raw: unknown): Cluster[] {
  if (!raw) return [];
  let arr: unknown[];
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is Cluster =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Cluster).id === "string" &&
        typeof (item as Cluster).title === "string",
    )
    .map((c, i) => ({
      ...c,
      sortOrder: c.sortOrder ?? i,
      childNodeIds: Array.isArray(c.childNodeIds) ? c.childNodeIds : [],
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function generateClusterId(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function groupChildrenByClusters<T extends { id: string }>(
  children: T[],
  clusters: Cluster[],
): { cluster: Cluster | null; children: T[] }[] {
  const assigned = new Set<string>();
  const groups: { cluster: Cluster | null; children: T[] }[] = [];

  for (const cluster of clusters) {
    const clusterChildren = cluster.childNodeIds
      .map((id) => children.find((c) => c.id === id))
      .filter((c): c is T => !!c);
    clusterChildren.forEach((c) => assigned.add(c.id));
    if (clusterChildren.length > 0 || clusters.length > 0) {
      groups.push({ cluster, children: clusterChildren });
    }
  }

  const unassigned = children.filter((c) => !assigned.has(c.id));
  if (unassigned.length > 0) {
    groups.push({ cluster: null, children: unassigned });
  }

  return groups;
}
