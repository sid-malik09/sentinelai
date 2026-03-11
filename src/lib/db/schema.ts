import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── PROJECTS ───
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── TOPICS ───
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keywords: jsonb("keywords")
      .$type<{ include: string[]; exclude: string[] }>()
      .notNull()
      .default({ include: [], exclude: [] }),
    category: varchar("category", { length: 50 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("topics_project_id_idx").on(table.projectId)]
);

// ─── MENTIONS ───
export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 50 }).notNull(),
    sourceId: varchar("source_id", { length: 500 }).notNull(),
    sourceUrl: text("source_url"),
    author: varchar("author", { length: 255 }),
    authorFollowers: integer("author_followers"),
    title: text("title"),
    content: text("content").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    collectedAt: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull(),
    engagement: jsonb("engagement").$type<{
      likes?: number;
      comments?: number;
      shares?: number;
      views?: number;
      score?: number;
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("mentions_topic_id_idx").on(table.topicId),
    index("mentions_source_idx").on(table.source),
    index("mentions_published_at_idx").on(table.publishedAt),
    uniqueIndex("mentions_source_source_id_uniq").on(table.source, table.sourceId),
  ]
);

// ─── ANALYSES ───
export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    sentimentScore: real("sentiment_score").notNull(),
    sentimentLabel: varchar("sentiment_label", { length: 20 }).notNull(),
    emotions: jsonb("emotions").$type<Record<string, number>>(),
    topicsExtracted: jsonb("topics_extracted").$type<string[]>(),
    keyPhrases: jsonb("key_phrases").$type<string[]>(),
    intent: varchar("intent", { length: 50 }),
    entities: jsonb("entities").$type<{ name: string; type: string }[]>(),
    summary: text("summary"),
    competitiveMention: boolean("competitive_mention").default(false),
    competitorNames: jsonb("competitor_names").$type<string[]>(),
    analysisModel: varchar("analysis_model", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("analyses_mention_id_uniq").on(table.mentionId),
    index("analyses_sentiment_label_idx").on(table.sentimentLabel),
  ]
);

// ─── ALERT RULES ───
export const alertRules = pgTable(
  "alert_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    ruleType: varchar("rule_type", { length: 50 }).notNull(),
    conditions: jsonb("conditions")
      .$type<{
        threshold?: number;
        window_hours?: number;
        keywords?: string[];
        sentiment_below?: number;
        volume_above?: number;
      }>()
      .notNull(),
    notificationChannels: jsonb("notification_channels")
      .$type<{ type: "email" | "webhook" | "slack"; target: string }[]>()
      .notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("alert_rules_project_id_idx").on(table.projectId)]
);

// ─── ALERTS ───
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => alertRules.id, { onDelete: "cascade" }),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow().notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    summary: text("summary").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    acknowledged: boolean("acknowledged").notNull().default(false),
  },
  (table) => [
    index("alerts_rule_id_idx").on(table.ruleId),
    index("alerts_triggered_at_idx").on(table.triggeredAt),
  ]
);

// ─── DAILY AGGREGATES ───
export const dailyAggregates = pgTable(
  "daily_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 50 }).notNull(),
    date: date("date").notNull(),
    mentionCount: integer("mention_count").notNull().default(0),
    avgSentiment: real("avg_sentiment"),
    sentimentDistribution: jsonb("sentiment_distribution").$type<{
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    }>(),
    topEmotions: jsonb("top_emotions").$type<{ emotion: string; score: number }[]>(),
    topPhrases: jsonb("top_phrases").$type<{ phrase: string; count: number }[]>(),
    totalEngagement: jsonb("total_engagement").$type<{
      likes: number;
      comments: number;
      shares: number;
      views: number;
    }>(),
  },
  (table) => [
    uniqueIndex("daily_agg_topic_date_source_uniq").on(table.topicId, table.date, table.source),
    index("daily_agg_date_idx").on(table.date),
  ]
);

// ─── RELATIONS ───
export const projectsRelations = relations(projects, ({ many }) => ({
  topics: many(topics),
  alertRules: many(alertRules),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  project: one(projects, { fields: [topics.projectId], references: [projects.id] }),
  mentions: many(mentions),
  dailyAggregates: many(dailyAggregates),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  topic: one(topics, { fields: [mentions.topicId], references: [topics.id] }),
  analysis: one(analyses, { fields: [mentions.id], references: [analyses.mentionId] }),
}));

export const analysesRelations = relations(analyses, ({ one }) => ({
  mention: one(mentions, { fields: [analyses.mentionId], references: [mentions.id] }),
}));

export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
  project: one(projects, { fields: [alertRules.projectId], references: [projects.id] }),
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  rule: one(alertRules, { fields: [alerts.ruleId], references: [alertRules.id] }),
}));

export const dailyAggregatesRelations = relations(dailyAggregates, ({ one }) => ({
  topic: one(topics, { fields: [dailyAggregates.topicId], references: [topics.id] }),
}));
