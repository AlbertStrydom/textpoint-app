import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LevelIIISecondaryTabPanelProps } from "./LevelIIISecondaryTabShared";

type LevelIIIRemindersTabContentProps = {
  props: LevelIIISecondaryTabPanelProps;
};

export function LevelIIIRemindersTabContent({ props }: LevelIIIRemindersTabContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Reminders</CardTitle>
        <CardDescription>
          Quick visibility of visits, renewals, and reviews due in the next 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.reminderItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders due soon.</p>
        ) : (
          props.reminderItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{item.subject}</p>
                <p className="text-sm text-muted-foreground">
                  {item.type} | {item.detail}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{new Date(item.dueDate).toLocaleDateString()}</p>
                {props.getDueBadge(item.dueDate)}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
