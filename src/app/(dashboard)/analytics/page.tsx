"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDate } from "@/lib/utils";

import { fetcher } from "@/lib/fetcher";

const DAY_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

const SOURCE_COLORS: Record<string, string> = {
  hackernews: "#ff6600",
  reddit: "#ff4500",
  news: "#8b5cf6",
};

interface TimelinePoint {
  date: string;
  avgSentiment: number | null;
  mentionCount: number;
  positive: number;
  negative: number;
  neutral: number;
}

interface VolumePoint {
  date: string;
  total: number;
  hackernews?: number;
  reddit?: number;
  news?: number;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const [source, setSource] = useState<string | null>(null);

  const query = new URLSearchParams({ days: String(days) });
  if (source) query.set("source", source);

  const { data: timeline } = useSWR<TimelinePoint[]>(
    `/api/analytics/sentiment-timeline?${query}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const { data: volume } = useSWR<VolumePoint[]>(
    `/api/analytics/mention-volume?${query}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const totalMentions = volume?.reduce((sum, d) => sum + d.total, 0) ?? 0;
  const avgSentiment =
    timeline && timeline.length > 0
      ? timeline.reduce(
          (sum, d) => sum + (d.avgSentiment ?? 0),
          0
        ) / timeline.filter((d) => d.avgSentiment != null).length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Sentiment trends, mention volume, and source breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Source filter */}
          <div className="flex rounded-md border">
            <button
              onClick={() => setSource(null)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !source
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {["hackernews", "reddit", "news"].map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  source === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div className="flex rounded-md border">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Mentions ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMentions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Sentiment ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgSentiment != null
                ? (avgSentiment > 0 ? "+" : "") +
                  avgSentiment.toFixed(2)
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Sentiment Split ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {timeline && timeline.length > 0 ? (
                <>
                  <Badge className="bg-green-100 text-green-800">
                    +{timeline.reduce((s, d) => s + d.positive, 0)}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-800">
                    {timeline.reduce((s, d) => s + d.neutral, 0)}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    -{timeline.reduce((s, d) => s + d.negative, 0)}
                  </Badge>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d)}
                  fontSize={12}
                />
                <YAxis domain={[-1, 1]} fontSize={12} />
                <Tooltip
                  labelFormatter={(d) => formatDate(d as string)}
                  formatter={(value) =>
                    value != null ? Number(value).toFixed(2) : "N/A"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="avgSentiment"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  name="Avg Sentiment"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No sentiment data for this period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Breakdown Stacked Area */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d)}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip labelFormatter={(d) => formatDate(d as string)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="positive"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.6}
                  name="Positive"
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stackId="1"
                  stroke="#eab308"
                  fill="#eab308"
                  fillOpacity={0.6}
                  name="Neutral"
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Negative"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No sentiment data for this period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mention Volume by Source */}
      <Card>
        <CardHeader>
          <CardTitle>Mention Volume by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {volume && volume.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d)}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip labelFormatter={(d) => formatDate(d as string)} />
                <Legend />
                <Bar
                  dataKey="hackernews"
                  stackId="a"
                  fill={SOURCE_COLORS.hackernews}
                  name="Hacker News"
                />
                <Bar
                  dataKey="reddit"
                  stackId="a"
                  fill={SOURCE_COLORS.reddit}
                  name="Reddit"
                />
                <Bar
                  dataKey="news"
                  stackId="a"
                  fill={SOURCE_COLORS.news}
                  name="News"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No mention data for this period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
