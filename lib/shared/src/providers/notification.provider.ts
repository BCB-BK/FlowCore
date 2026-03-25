export type NotificationChannel = "in_app" | "email" | "teams";

export interface NotificationPayload {
  recipientPrincipalId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface INotificationProvider {
  send(
    payload: NotificationPayload,
  ): Promise<{ delivered: boolean; messageId?: string }>;
  sendBatch(
    payloads: NotificationPayload[],
  ): Promise<Array<{ delivered: boolean; messageId?: string }>>;
  getUnreadCount(principalId: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
}
