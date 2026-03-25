export interface ConnectorPerson {
  externalId: string;
  displayName: string;
  email?: string;
  upn?: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
}

export interface ConnectorGroup {
  externalId: string;
  displayName: string;
  description?: string;
  memberCount?: number;
}

export interface IConnectorProvider {
  searchPeople(query: string, limit?: number): Promise<ConnectorPerson[]>;
  searchGroups(query: string, limit?: number): Promise<ConnectorGroup[]>;
  getPerson(externalId: string): Promise<ConnectorPerson | null>;
  getGroup(externalId: string): Promise<ConnectorGroup | null>;
  getGroupMembers(groupId: string): Promise<ConnectorPerson[]>;
  syncPrincipal(
    externalId: string,
  ): Promise<{ synced: boolean; principalId: string }>;
}
