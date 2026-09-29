import { AnalyticsEvent, AnalyticsProvider } from '../analytics-provider';

export class NoopAnalyticsProvider implements AnalyticsProvider {
  public readonly name = 'noop';
  public readonly capturedEvents: AnalyticsEvent[] = [];

  async capture(event: AnalyticsEvent): Promise<void> {
    this.capturedEvents.push({
      ...event,
      timestamp: event.timestamp || new Date(),
    });
  }

  getCapturedEvents(): AnalyticsEvent[] {
    return [...this.capturedEvents];
  }

  clear(): void {
    this.capturedEvents.length = 0;
  }
}
