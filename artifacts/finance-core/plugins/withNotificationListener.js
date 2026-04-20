// Expo Config Plugin — Pilar Financeiro Notification & SMS Listener
// Adds FinanceNotificationService + FinanceSmsReceiver to Android native build.
// Applied automatically during `expo prebuild` or `eas build`.

const fs = require('fs');
const path = require('path');

function resolveConfigPlugins() {
  const attempts = [
    () => require('@expo/config-plugins'),
    () => {
      const expoPkg = require.resolve('expo/package.json');
      return require(require.resolve('@expo/config-plugins', { paths: [path.dirname(expoPkg)] }));
    },
    () => require(require.resolve('@expo/config-plugins', { paths: [process.cwd()] })),
    () => require(require.resolve('@expo/config-plugins', { paths: [path.join(process.cwd(), 'artifacts', 'finance-core')] })),
  ];
  let lastErr;
  for (const fn of attempts) {
    try { return fn(); } catch (e) { lastErr = e; }
  }
  throw new Error('Cannot resolve @expo/config-plugins from any known path: ' + (lastErr && lastErr.message));
}

const { withAndroidManifest, withDangerousMod } = resolveConfigPlugins();

const PACKAGE_DIR = 'com/financecore/notificationlistener';

/**
 * Step 1: Modify AndroidManifest.xml
 * - Declares FinanceNotificationService with BIND_NOTIFICATION_LISTENER_SERVICE permission
 * - Declares FinanceSmsReceiver with android.provider.Telephony.SMS_RECEIVED action
 * - Adds READ_SMS, RECEIVE_SMS permissions
 */
function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    const pkgName = manifest.manifest.$['package'] ?? 'com.financecore';

    // ── Notification Listener Service ─────────────────────────────────────────
    const notifService = {
      $: {
        'android:name': `${pkgName}.notificationlistener.FinanceNotificationService`,
        'android:label': 'Pilar Financeiro Listener',
        'android:exported': 'true',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.service.notification.NotificationListenerService' } },
          ],
        },
      ],
    };

    // ── SMS Broadcast Receiver ────────────────────────────────────────────────
    const smsReceiver = {
      $: {
        'android:name': `${pkgName}.notificationlistener.FinanceSmsReceiver`,
        'android:exported': 'true',
        'android:enabled': 'true',
      },
      'intent-filter': [
        {
          $: { 'android:priority': '999' },
          action: [
            { $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } },
          ],
        },
      ],
    };

    // Avoid duplicate entries
    if (!app.service) app.service = [];
    if (!app.service.some((s) => s.$?.['android:name']?.includes('FinanceNotificationService'))) {
      app.service.push(notifService);
    }

    if (!app.receiver) app.receiver = [];
    if (!app.receiver.some((r) => r.$?.['android:name']?.includes('FinanceSmsReceiver'))) {
      app.receiver.push(smsReceiver);
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    const permsNeeded = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
    ];

    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];
    for (const perm of permsNeeded) {
      if (!manifest.manifest['uses-permission'].some((p) => p.$?.['android:name'] === perm)) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    return cfg;
  });
}

/**
 * Step 2: Copy Kotlin source files into the Android project
 * Runs after `expo prebuild` generates the android/ directory.
 */
function withKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const platformRoot = cfg.modRequest.platformProjectRoot; // .../android
      const pkgBase = cfg.android?.package ?? 'com.financecore';
      const destDir = path.join(
        platformRoot,
        'app',
        'src',
        'main',
        'java',
        ...pkgBase.split('.'),
        'notificationlistener'
      );

      fs.mkdirSync(destDir, { recursive: true });

      const srcDir = path.join(__dirname, 'kotlin');
      const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.kt'));

      for (const file of files) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        let content = fs.readFileSync(src, 'utf-8');

        // Replace generic package name with actual app package
        content = content.replace(
          /^package com\.financecore\.notificationlistener/m,
          `package ${pkgBase}.notificationlistener`
        );

        fs.writeFileSync(dest, content, 'utf-8');
        console.log(`[withNotificationListener] Copied ${file} → ${dest}`);
      }

      return cfg;
    },
  ]);
}

/**
 * Compose both modifications
 */
module.exports = function withNotificationListener(config) {
  config = withManifest(config);
  config = withKotlinFiles(config);
  return config;
};
