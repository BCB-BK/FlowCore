import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const searchQueriesTable = pgTable("search_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  query: text("query").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  userId: text("user_id"),
  clickedNodeId: text("clicked_node_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
