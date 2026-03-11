import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Sentiment trends, source distribution, and competitive intelligence.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Analytics will appear here once mentions are collected and analyzed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
