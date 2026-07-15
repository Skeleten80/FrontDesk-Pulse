import { addHours, addMinutes, setMinutes, setSeconds } from "date-fns";
import type {
  AppointmentResult,
  AvailabilityRequest,
  AvailableSlot,
  CalendarProvider,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
} from "@/providers/calendar/types";

export class MockCalendarProvider implements CalendarProvider {
  private readonly bookings = new Map<string, AppointmentResult>();

  async getAvailability(input: AvailabilityRequest): Promise<AvailableSlot[]> {
    const slots: AvailableSlot[] = [];
    let cursor = setSeconds(setMinutes(addHours(input.earliestStart, 2), 0), 0);

    while (slots.length < 3 && cursor < input.latestEnd) {
      const end = addMinutes(cursor, input.durationMinutes);
      if (end <= input.latestEnd) {
        slots.push({
          startTime: cursor,
          endTime: end,
          timezone: input.timezone,
        });
      }
      cursor = addHours(cursor, 3);
    }

    return slots;
  }

  async createAppointment(input: CreateAppointmentRequest): Promise<AppointmentResult> {
    const externalCalendarEventId = `mock_cal_${crypto.randomUUID()}`;
    const result: AppointmentResult = {
      externalCalendarEventId,
      startTime: input.startTime,
      endTime: input.endTime,
      timezone: input.timezone,
    };
    this.bookings.set(externalCalendarEventId, result);
    return result;
  }

  async cancelAppointment(input: CancelAppointmentRequest): Promise<void> {
    this.bookings.delete(input.externalCalendarEventId);
  }
}
