import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function MentionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mentions</h2>
        <p className="text-muted-foreground">
          View and filter collected mentions across all sources.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Mentions</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No mentions collected yet. Set up data collectors to start ingesting
            mentions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
