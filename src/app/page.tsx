import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp, Bell, Users } from "lucide-react";

const stats = [
  {
    title: "Total Mentions",
    value: "0",
    description: "Across all sources",
    icon: MessageSquare,
  },
  {
    title: "Avg Sentiment",
    value: "--",
    description: "No data yet",
    icon: TrendingUp,
  },
  {
    title: "Active Alerts",
    value: "0",
    description: "No alerts configured",
    icon: Bell,
  },
  {
    title: "Competitors Tracked",
    value: "0",
    description: "Add topics to start",
    icon: Users,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your social listening activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Over Time</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Create a project and add topics to start collecting data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Mentions</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No mentions collected yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
