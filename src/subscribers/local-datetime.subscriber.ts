import {
  EventSubscriber,
  type EntitySubscriberInterface,
  type InsertEvent,
  type UpdateEvent,
} from "typeorm";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import { wallClockToDbDate } from "../utils/local-datetime.js";

@EventSubscriber()
export class LocalDateTimeSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    if (!event.entity) return;

    const now = wallClockToDbDate(getClientLocalWallClock());

    if (event.metadata.findColumnWithPropertyName("createdAt")) {
      event.entity.createdAt = now;
    }
    if (event.metadata.findColumnWithPropertyName("updatedAt")) {
      event.entity.updatedAt = now;
    }
  }

  beforeUpdate(event: UpdateEvent<Record<string, unknown>>): void {
    if (!event.entity) return;

    if (event.metadata.findColumnWithPropertyName("updatedAt")) {
      event.entity.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    }
  }
}
