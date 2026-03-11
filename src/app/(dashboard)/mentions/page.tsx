"use client";

import { useState } from "react";
import useSWR from "swr";
import { ExternalLink, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime, sentimentBgColor } from "@/lib/utils";

import { fetcher } from "@/lib/fetcher";

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "hackernews", label: "Hacker News" },
  { value: "reddit", label: "Reddit" },
  { value: "news", label: "News/RSS" },
];

interface Mention {
  id: string;
  topicId: string;
  source: string;
  sourceUrl: string | null;
  author: string | null;
  title: string | null;
  content: string;
  publishedAt: string | null;
  engagement: {
    likes?: number;
    comments?: number;
    score?: number;
  } | null;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  topicName: string | null;
}

interface MentionsResponse {
  mentions: Mention[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function sourceIcon(source: string) {
  switch (source) {
    case "hackernews":
      return "HN";
    case "reddit":
      return "R";
    case "news":
      return "N";
    default:
      return "?";
  }
}

function sourceBadgeColor(source: string) {
  switch (source) {
    case "hackernews":
      return "bg-orange-100 text-orange-800";
    case "reddit":
      return "bg-blue-100 text-blue-800";
    case "news":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function MentionsPage() {
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (source !== "all") params.set("source", source);

  const { data, error, isLoading } = useSWR<MentionsResponse>(
    `/api/mentions?${params}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mentions</h2>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading..."
              : error
                ? "Error loading mentions"
                : `${data?.pagination.total ?? 0} mentions collected`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={source}
            onValueChange={(val) => {
              if (val) setSource(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading mentions...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium text-destructive">
              Failed to load mentions
            </p>
            <p className="text-xs text-muted-foreground">
              {error.message ?? "Unknown error"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !data || data.mentions.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No mentions found. Create a project with topics to start
              collecting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data.mentions.map((mention) => (
              <Card key={mention.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${sourceBadgeColor(mention.source)}`}
                        >
                          {sourceIcon(mention.source)}
                        </span>
                        {mention.title && (
                          <CardTitle className="text-sm truncate">
                            {mention.title}
                          </CardTitle>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {mention.author && <span>by {mention.author}</span>}
                        {mention.publishedAt && (
                          <span>{formatRelativeTime(mention.publishedAt)}</span>
                        )}
                        {mention.topicName && (
                          <Badge variant="outline" className="text-xs">
                            {mention.topicName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {mention.sentimentLabel && (
                        <Badge
                          className={sentimentBgColor(mention.sentimentLabel)}
                        >
                          {mention.sentimentLabel}
                        </Badge>
                      )}
                      {mention.sourceUrl && (
                        <a
                          href={mention.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {mention.content}
                  </p>
                  {mention.engagement && (
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      {mention.engagement.score != null && (
                        <span>{mention.engagement.score} points</span>
                      )}
                      {mention.engagement.comments != null && (
                        <span>{mention.engagement.comments} comments</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
