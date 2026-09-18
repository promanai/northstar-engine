import handler from 'vinext/server/fetch-handler';
import { env } from 'cloudflare:workers';
import { engineMode } from '@/lib/engine-mode';
import { bookingNotificationCron } from '@/lib/booking-telegram-policy';
import { drainBookingNotifications } from '@/lib/booking-notifications';
import {
  analyticsCleanupCron,
  cleanupAnalyticsScheduled,
} from '@/lib/analytics-policy';

const worker = {
  ...handler,
  async scheduled(controller: ScheduledController) {
    if (
      engineMode() !== 'lite' &&
      controller.cron === bookingNotificationCron
    ) {
      await drainBookingNotifications();
      return;
    }
    // Unknown schedules belong to future jobs. Lite never touches storage,
    // even when an installation accidentally keeps a Standard cron trigger.
    if (controller.cron !== analyticsCleanupCron || engineMode() === 'lite')
      return;
    try {
      const result = await cleanupAnalyticsScheduled(env.DB);
      console.log(
        JSON.stringify({ job: 'analytics-retention', status: 'ok', ...result }),
      );
    } catch {
      // Do not log raw DB errors, queries, message text or user identifiers.
      console.error(
        JSON.stringify({ job: 'analytics-retention', status: 'failed' }),
      );
      throw new Error('Analytics retention failed; check D1 and migrations');
    }
  },
};
export default worker;
