import React, { useState } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import moment from "moment";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./MaintenanceCalendar.css";

const localizer = momentLocalizer(moment);

export interface EquipmentEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    equipmentId: number;
    serialNumber?: string;
    status: "normal" | "warning" | "urgent" | "critical";
    escalationLevel: number;
  };
}

interface MaintenanceCalendarProps {
  events: EquipmentEvent[];
  onReschedule: (equipmentId: number, newDate: Date) => Promise<void>;
  onEventClick?: (event: EquipmentEvent) => void;
}

const eventStyleGetter = (event: EquipmentEvent) => {
  let backgroundColor = "#3b82f6";
  let borderColor = "#1e40af";

  if (event.resource.status === "warning") {
    backgroundColor = "#eab308";
    borderColor = "#ca8a04";
  } else if (event.resource.status === "urgent") {
    backgroundColor = "#f97316";
    borderColor = "#ea580c";
  } else if (event.resource.status === "critical") {
    backgroundColor = "#ef4444";
    borderColor = "#dc2626";
  }

  return {
    style: {
      backgroundColor,
      borderRadius: "4px",
      opacity: 0.9,
      color: "white",
      border: `2px solid ${borderColor}`,
      display: "block",
      cursor: "grab",
    },
  };
};

const DraggableEvent: React.FC<{
  event: EquipmentEvent;
  onDrop: (event: EquipmentEvent, date: Date) => void;
}> = ({ event }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "equipment",
    item: event,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const style = eventStyleGetter(event);

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      style={{
        ...style.style,
        opacity: isDragging ? 0.5 : style.style.opacity,
      }}
      className="p-1 text-xs font-semibold"
    >
      {event.title}
    </div>
  );
};

const DroppableDay: React.FC<{
  date: Date;
  onDrop: (event: EquipmentEvent, date: Date) => void;
}> = ({ date, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "equipment",
    drop: (item: EquipmentEvent) => {
      onDrop(item, date);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      style={{
        backgroundColor: isOver ? "#f0f9ff" : "transparent",
        border: isOver ? "2px dashed #3b82f6" : "1px solid #e5e7eb",
      }}
      className="min-h-[100px] p-2 rounded"
    />
  );
};

export const MaintenanceCalendar: React.FC<MaintenanceCalendarProps> = ({
  events,
  onReschedule,
  onEventClick,
}) => {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EquipmentEvent | null>(null);
  const [newDate, setNewDate] = useState<string>("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleSelectEvent = (event: EquipmentEvent) => {
    setSelectedEvent(event);
    setNewDate(format(event.start, "yyyy-MM-dd"));
    onEventClick?.(event);
  };

  const handleReschedule = async () => {
    if (!selectedEvent || !newDate) return;

    try {
      setIsRescheduling(true);
      const newDateObj = new Date(newDate);
      await onReschedule(selectedEvent.resource.equipmentId, newDateObj);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to reschedule:", error);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleDrop = async (event: EquipmentEvent, newDateObj: Date) => {
    try {
      await onReschedule(event.resource.equipmentId, newDateObj);
    } catch (error) {
      console.error("Failed to reschedule via drag-and-drop:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <Clock className="w-4 h-4" />;
      case "warning":
        return <AlertCircle className="w-4 h-4" />;
      case "urgent":
        return <AlertTriangle className="w-4 h-4" />;
      case "critical":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Equipment Maintenance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg border border-border">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={["month", "week", "day", "agenda"]}
                popup
                selectable
                components={{
                  event: ({ event }) => (
                    <DraggableEvent event={event as EquipmentEvent} onDrop={handleDrop} />
                  ),
                  dateCellWrapper: ({ value, children }) => (
                    <div className="relative">
                      <DroppableDay date={value as Date} onDrop={handleDrop} />
                      <div className="absolute inset-0 pointer-events-none">{children}</div>
                    </div>
                  ),
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-sm">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-sm">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span className="text-sm">Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm">Critical</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Equipment Maintenance</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Equipment</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.title}</p>
                  {selectedEvent.resource.serialNumber && (
                    <p className="text-sm text-muted-foreground">
                      Serial: {selectedEvent.resource.serialNumber}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    {getStatusIcon(selectedEvent.resource.status)}
                    <span>Current Status</span>
                  </p>
                  <Badge className={getStatusBadgeColor(selectedEvent.resource.status)}>
                    {selectedEvent.resource.status.charAt(0).toUpperCase() +
                      selectedEvent.resource.status.slice(1)}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Current Due Date</p>
                  <p className="text-sm">{format(selectedEvent.start, "MMMM d, yyyy")}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">New Due Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleReschedule}
                    disabled={isRescheduling || !newDate}
                    className="flex-1"
                  >
                    {isRescheduling ? "Rescheduling..." : "Reschedule"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
};

export default MaintenanceCalendar;
