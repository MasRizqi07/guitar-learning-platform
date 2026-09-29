export interface AnalyticsEvent {
  name: string;
  distinctId: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface AnalyticsProvider {
  name: string;
  capture(event: AnalyticsEvent): Promise<void>;
  shutdown?(): Promise<void>;
}
