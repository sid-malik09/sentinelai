import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your platform settings and API credentials.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Settings will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
