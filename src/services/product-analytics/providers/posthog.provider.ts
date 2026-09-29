import { AnalyticsEvent, AnalyticsProvider } from '../analytics-provider';

export interface PostHogProviderConfig {
  apiKey: string;
  host?: string;
  timeoutMs?: number;
}

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  public readonly name = 'posthog';
  private readonly apiKey: string;
  private readonly host: string;
  private readonly timeoutMs: number;

  constructor(config: PostHogProviderConfig) {
    this.apiKey = config.apiKey;
    this.host = (config.host || 'https://app.posthog.com').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 3000;
  }

  async capture(event: AnalyticsEvent): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const payload = {
        api_key: this.apiKey,
        event: event.name,
        distinct_id: event.distinctId,
        properties: {
          ...event.properties,
          $lib: 'guitar-learning-platform',
        },
        timestamp: (event.timestamp || new Date()).toISOString(),
      };

      const res = await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[PostHogAnalyticsProvider] Non-OK capture response: ${res.status}`);
      }
    } catch (err: unknown) {
      // Invariant: Behavioral analytics tracking must NEVER throw or impact application state
      console.warn('[PostHogAnalyticsProvider] Failed to dispatch event:', err instanceof Error ? err.message : err);
    }
  }
}
