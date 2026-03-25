export type { ProviderResult } from "./result";
export { ok, fail } from "./result";
export type {
  IAuthProvider,
  AuthTokenResult,
  AuthUserInfo,
} from "./auth.provider";
export type {
  IStorageProvider,
  StorageUploadResult,
  StorageDownloadResult,
} from "./storage.provider";
export type {
  ISearchProvider,
  SearchResult,
  SearchQuery,
  SearchFacet,
  SearchResponse,
} from "./search.provider";
export type {
  IAIProvider,
  EmbeddingResult,
  CompletionResult,
  RAGContext,
} from "./ai.provider";
export type {
  IConnectorProvider,
  ConnectorPerson,
  ConnectorGroup,
} from "./connector.provider";
export type {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
} from "./notification.provider";
