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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

import { fetcher } from "@/lib/fetcher";

interface AlertRule {
  id: string;
  projectId: string;
  projectName: string | null;
  name: string;
  ruleType: string;
  conditions: {
    threshold?: number;
    window_hours?: number;
    keywords?: string[];
    sentiment_below?: number;
    volume_above?: number;
  };
  notificationChannels: { type: string; target: string }[];
  isActive: boolean;
  createdAt: string;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string | null;
  ruleType: string | null;
  triggeredAt: string;
  severity: string;
  summary: string;
  data: Record<string, unknown> | null;
  acknowledged: boolean;
}

interface Project {
  id: string;
  name: string;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  sentiment_drop: "Sentiment Drop",
  volume_spike: "Volume Spike",
  keyword_alert: "Keyword Alert",
};

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case "high":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800",
  };
  return colors[severity] ?? "bg-gray-100 text-gray-800";
}

export default function AlertsPage() {
  const [tab, setTab] = useState<"rules" | "alerts">("alerts");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: rules, mutate: mutateRules } = useSWR<AlertRule[]>(
    "/api/alert-rules",
    fetcher
  );
  const { data: alertsList, mutate: mutateAlerts } = useSWR<Alert[]>(
    "/api/alerts",
    fetcher,
    { refreshInterval: 30000 }
  );
  const { data: projects } = useSWR<Project[]>("/api/projects", fetcher);

  // Create form state
  const [ruleType, setRuleType] = useState("sentiment_drop");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  async function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const conditions: Record<string, unknown> = {
      window_hours: parseInt(formData.get("window_hours") as string) || 24,
    };

    if (ruleType === "sentiment_drop") {
      conditions.sentiment_below =
        parseFloat(formData.get("sentiment_below") as string) || -0.3;
    } else if (ruleType === "volume_spike") {
      conditions.volume_above =
        parseInt(formData.get("volume_above") as string) || 50;
    } else if (ruleType === "keyword_alert") {
      const kw = (formData.get("keywords") as string) || "";
      conditions.keywords = kw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      conditions.threshold =
        parseInt(formData.get("threshold") as string) || 1;
    }

    const channelTarget = (formData.get("channel_target") as string) || "";
    const channelType = (formData.get("channel_type") as string) || "webhook";

    const res = await fetch("/api/alert-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
        name: formData.get("name"),
        ruleType,
        conditions,
        notificationChannels: channelTarget
          ? [{ type: channelType, target: channelTarget }]
          : [],
      }),
    });

    if (res.ok) {
      mutateRules();
      setCreateOpen(false);
    }
    setCreating(false);
  }

  async function toggleRule(ruleId: string, isActive: boolean) {
    await fetch(`/api/alert-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    mutateRules();
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/alert-rules/${ruleId}`, { method: "DELETE" });
    mutateRules();
  }

  async function acknowledgeAlert(alertId: string) {
    await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
    mutateAlerts();
  }

  const unacknowledgedCount =
    alertsList?.filter((a) => !a.acknowledged).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alerts</h2>
          <p className="text-muted-foreground">
            Configure alert rules and view triggered alerts.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Alert Rule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Negative sentiment spike"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  <option value="">Select project...</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Rule Type</Label>
                <div className="flex rounded-md border">
                  {(
                    [
                      "sentiment_drop",
                      "volume_spike",
                      "keyword_alert",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRuleType(t)}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                        ruleType === t
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {RULE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="window_hours">Time Window (hours)</Label>
                <Input
                  id="window_hours"
                  name="window_hours"
                  type="number"
                  defaultValue={24}
                  min={1}
                  max={720}
                />
              </div>

              {ruleType === "sentiment_drop" && (
                <div className="space-y-2">
                  <Label htmlFor="sentiment_below">
                    Alert when sentiment below
                  </Label>
                  <Input
                    id="sentiment_below"
                    name="sentiment_below"
                    type="number"
                    step="0.1"
                    defaultValue={-0.3}
                    min={-1}
                    max={1}
                  />
                </div>
              )}

              {ruleType === "volume_spike" && (
                <div className="space-y-2">
                  <Label htmlFor="volume_above">
                    Alert when mentions exceed
                  </Label>
                  <Input
                    id="volume_above"
                    name="volume_above"
                    type="number"
                    defaultValue={50}
                    min={1}
                  />
                </div>
              )}

              {ruleType === "keyword_alert" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="keywords">
                      Keywords (comma-separated)
                    </Label>
                    <Input
                      id="keywords"
                      name="keywords"
                      placeholder="e.g., outage, data breach, lawsuit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Min matches to trigger</Label>
                    <Input
                      id="threshold"
                      name="threshold"
                      type="number"
                      defaultValue={1}
                      min={1}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Notification (optional)</Label>
                <div className="flex gap-2">
                  <select
                    name="channel_type"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="webhook">Webhook</option>
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                  </select>
                  <Input
                    name="channel_target"
                    placeholder="URL or email"
                    className="flex-1"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Rule"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex rounded-md border w-fit">
        <button
          onClick={() => setTab("alerts")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "alerts"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Triggered Alerts
          {unacknowledgedCount > 0 && (
            <Badge className="ml-2 bg-red-100 text-red-800">
              {unacknowledgedCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab("rules")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "rules"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Alert Rules ({rules?.length ?? 0})
        </button>
      </div>

      {tab === "alerts" && (
        <Card>
          <CardHeader>
            <CardTitle>Triggered Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsList && alertsList.length > 0 ? (
              <div className="space-y-3">
                {alertsList.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start justify-between gap-4 rounded-md border p-3 ${
                      alert.acknowledged ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {severityIcon(alert.severity)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {alert.ruleName ?? "Unknown Rule"}
                          </p>
                          <Badge className={severityBadge(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.acknowledged && (
                            <Badge className="bg-green-100 text-green-800">
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.summary}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(alert.triggeredAt)}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Ack
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No alerts triggered yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "rules" && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {rules && rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-4 rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <Badge variant="outline">
                          {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                        </Badge>
                        {rule.projectName && (
                          <Badge variant="secondary">{rule.projectName}</Badge>
                        )}
                        <Badge
                          className={
                            rule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {rule.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Window: {rule.conditions.window_hours ?? 24}h
                        {rule.ruleType === "sentiment_drop" &&
                          ` · Threshold: ${rule.conditions.sentiment_below ?? -0.3}`}
                        {rule.ruleType === "volume_spike" &&
                          ` · Threshold: ${rule.conditions.volume_above ?? 50} mentions`}
                        {rule.ruleType === "keyword_alert" &&
                          ` · Keywords: ${(rule.conditions.keywords ?? []).join(", ")}`}
                        {rule.notificationChannels.length > 0 &&
                          ` · Notify: ${rule.notificationChannels.map((c) => c.type).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRule(rule.id, rule.isActive)}
                      >
                        {rule.isActive ? "Pause" : "Enable"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No alert rules configured yet.
                </p>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Create your first rule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
