import { pgTable, varchar, json, timestamp, index } from "drizzle-orm/pg-core";

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").notNull().primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("user_sessions_expire_idx").on(table.expire)],
);
