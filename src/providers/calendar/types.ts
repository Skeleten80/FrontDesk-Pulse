export type AvailabilityRequest = {
  tenantId: string;
  timezone: string;
  durationMinutes: number;
  earliestStart: Date;
  latestEnd: Date;
};

export type AvailableSlot = {
  startTime: Date;
  endTime: Date;
  timezone: string;
};

export type CreateAppointmentRequest = {
  tenantId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail?: string;
};

export type AppointmentResult = {
  externalCalendarEventId: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
};

export type CancelAppointmentRequest = {
  tenantId: string;
  externalCalendarEventId: string;
};

export interface CalendarProvider {
  getAvailability(input: AvailabilityRequest): Promise<AvailableSlot[]>;
  createAppointment(input: CreateAppointmentRequest): Promise<AppointmentResult>;
  cancelAppointment(input: CancelAppointmentRequest): Promise<void>;
}
