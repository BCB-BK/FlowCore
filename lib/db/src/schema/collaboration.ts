import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { contentNodesTable } from "./content-nodes";
import { contentRevisionsTable } from "./content-revisions";
import { principalsTable } from "./principals";
import {
  commentStatusEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  verificationStatusEnum,
} from "./enums";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pageWatchersTable = pgTable(
  "page_watchers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principalsTable.id),
    watchChildren: boolean("watch_children").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_page_watchers_unique").on(table.nodeId, table.principalId),
  ],
);

export const pageCommentsTable = pgTable("page_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  revisionId: uuid("revision_id").references(() => contentRevisionsTable.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => principalsTable.id),
  parentCommentId: uuid("parent_comment_id").references(
    (): AnyPgColumn => pageCommentsTable.id,
  ),
  content: text("content").notNull(),
  anchorSelector: text("anchor_selector"),
  status: commentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pageVerificationsTable = pgTable("page_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => contentNodesTable.id),
  verifiedBy: uuid("verified_by")
    .notNull()
    .references(() => principalsTable.id),
  status: verificationStatusEnum("status").notNull().default("verified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  nextVerificationDue: timestamp("next_verification_due", {
    withTimezone: true,
  }),
  comment: text("comment"),
});

export const favoritesTable = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principalsTable.id),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_favorites_unique").on(table.principalId, table.nodeId),
  ],
);

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => principalsTable.id),
  channel: notificationChannelEnum("channel").notNull().default("in_app"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  nodeId: uuid("node_id").references(() => contentNodesTable.id),
  actorId: uuid("actor_id").references(() => principalsTable.id),
  status: notificationStatusEnum("status").notNull().default("unread"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const insertPageWatcherSchema = createInsertSchema(
  pageWatchersTable,
).omit({ id: true, createdAt: true });
export type InsertPageWatcher = z.infer<typeof insertPageWatcherSchema>;
export type PageWatcher = typeof pageWatchersTable.$inferSelect;

export const insertPageCommentSchema = createInsertSchema(
  pageCommentsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPageComment = z.infer<typeof insertPageCommentSchema>;
export type PageComment = typeof pageCommentsTable.$inferSelect;

export const insertPageVerificationSchema = createInsertSchema(
  pageVerificationsTable,
).omit({ id: true, verifiedAt: true });
export type InsertPageVerification = z.infer<
  typeof insertPageVerificationSchema
>;
export type PageVerification = typeof pageVerificationsTable.$inferSelect;

export const insertFavoriteSchema = createInsertSchema(favoritesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favoritesTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
