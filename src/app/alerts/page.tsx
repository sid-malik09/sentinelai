import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Alerts</h2>
        <p className="text-muted-foreground">
          Configure alert rules and view triggered alerts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No alert rules configured yet. Alerts will be available in a future
            update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
