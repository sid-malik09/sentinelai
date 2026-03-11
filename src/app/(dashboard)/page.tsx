"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  TrendingUp,
  Bell,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatRelativeTime, sentimentBgColor } from "@/lib/utils";

import { fetcher } from "@/lib/fetcher";

const SOURCE_COLORS: Record<string, string> = {
  hackernews: "#ff6600",
  reddit: "#ff4500",
  news: "#8b5cf6",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#eab308",
  mixed: "#f97316",
};

interface OverviewData {
  stats: {
    totalMentions: number;
    avgSentiment: number | null;
    activeAlertRules: number;
    sourcesActive: number;
  };
  sourceDistribution: { source: string; count: number }[];
  sentimentDistribution: { label: string; count: number }[];
  recentMentions: {
    id: string;
    source: string;
    title: string | null;
    author: string | null;
    publishedAt: string | null;
    sentimentLabel: string | null;
    sentimentScore: number | null;
    engagement: Record<string, number> | null;
  }[];
}

export default function DashboardPage() {
  const { data } = useSWR<OverviewData>("/api/analytics/overview", fetcher, {
    refreshInterval: 30000,
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your social listening activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Mentions
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalMentions ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">Across all sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Sentiment
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgSentiment != null
                ? stats.avgSentiment > 0
                  ? `+${stats.avgSentiment}`
                  : stats.avgSentiment
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.avgSentiment != null
                ? stats.avgSentiment > 0.1
                  ? "Generally positive"
                  : stats.avgSentiment < -0.1
                    ? "Generally negative"
                    : "Mostly neutral"
                : "No data yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeAlertRules ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Active rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sources Active
            </CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.sourcesActive ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Data sources</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.sourceDistribution && data.sourceDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={data.sourceDistribution}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {data.sourceDistribution.map((entry) => (
                        <Cell
                          key={entry.source}
                          fill={SOURCE_COLORS[entry.source] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.sourceDistribution.map((entry) => (
                    <div key={entry.source} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            SOURCE_COLORS[entry.source] ?? "#94a3b8",
                        }}
                      />
                      <span className="text-sm capitalize">{entry.source}</span>
                      <span className="text-sm text-muted-foreground">
                        ({entry.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.sentimentDistribution &&
            data.sentimentDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={data.sentimentDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {data.sentimentDistribution.map((entry) => (
                        <Cell
                          key={entry.label}
                          fill={SENTIMENT_COLORS[entry.label] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.sentimentDistribution.map((entry) => (
                    <div key={entry.label} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            SENTIMENT_COLORS[entry.label] ?? "#94a3b8",
                        }}
                      />
                      <span className="text-sm capitalize">{entry.label}</span>
                      <span className="text-sm text-muted-foreground">
                        ({entry.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Mentions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentMentions && data.recentMentions.length > 0 ? (
            <div className="space-y-3">
              {data.recentMentions.map((mention) => (
                <div
                  key={mention.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {mention.title ?? "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{mention.source}</span>
                      {mention.author && <span>by {mention.author}</span>}
                      {mention.publishedAt && (
                        <span>{formatRelativeTime(mention.publishedAt)}</span>
                      )}
                    </div>
                  </div>
                  {mention.sentimentLabel && (
                    <Badge className={sentimentBgColor(mention.sentimentLabel)}>
                      {mention.sentimentLabel}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No mentions collected yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
