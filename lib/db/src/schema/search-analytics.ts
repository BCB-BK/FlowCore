import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const searchQueriesTable = pgTable("search_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  query: text("query").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const searchClicksTable = pgTable("search_clicks", {
  id: uuid("id").defaultRandom().primaryKey(),
  queryId: uuid("query_id").references(() => searchQueriesTable.id, {
    onDelete: "cascade",
  }),
  nodeId: text("node_id").notNull(),
  position: integer("position"),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
