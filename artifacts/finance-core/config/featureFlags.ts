export const DISABLE_BACKGROUND_TASKS =
  process.env.EXPO_PUBLIC_DISABLE_BACKGROUND_TASKS === 'true';

let logged = false;
export function logBackgroundTasksStatus(): void {
  if (logged) return;
  logged = true;
  if (DISABLE_BACKGROUND_TASKS) {
    console.log('[JOBS-MOBILE] background tasks disabled');
  }
}
