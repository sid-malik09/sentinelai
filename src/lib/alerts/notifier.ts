interface NotificationPayload {
  alertId: string;
  ruleName: string;
  severity: string;
  summary: string;
  data: Record<string, unknown>;
  triggeredAt: string;
}

interface NotificationChannel {
  type: "email" | "webhook" | "slack";
  target: string;
}

async function sendWebhook(
  target: string,
  payload: NotificationPayload
): Promise<void> {
  const res = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook failed: ${res.status} ${res.statusText}`);
  }
}

async function sendEmail(
  target: string,
  payload: NotificationPayload
): Promise<void> {
  // Use Resend if API key is available
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(
      `[Alert Email] Would send to ${target}: ${payload.summary} (RESEND_API_KEY not configured)`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "alerts@sentinelai.app",
      to: [target],
      subject: `[SentinelAI] ${payload.severity.toUpperCase()} Alert: ${payload.ruleName}`,
      html: `
        <h2>Alert Triggered: ${payload.ruleName}</h2>
        <p><strong>Severity:</strong> ${payload.severity}</p>
        <p><strong>Summary:</strong> ${payload.summary}</p>
        <p><strong>Triggered at:</strong> ${payload.triggeredAt}</p>
        <pre>${JSON.stringify(payload.data, null, 2)}</pre>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend email failed: ${res.status} ${body}`);
  }
}

export async function sendNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<void> {
  switch (channel.type) {
    case "webhook":
      await sendWebhook(channel.target, payload);
      break;
    case "email":
      await sendEmail(channel.target, payload);
      break;
    case "slack":
      // Slack incoming webhook is the same format as webhook
      await sendWebhook(channel.target, payload);
      break;
    default:
      console.warn(`Unknown notification channel type: ${channel.type}`);
  }
}

export async function notifyChannels(
  channels: NotificationChannel[],
  payload: NotificationPayload
): Promise<string[]> {
  const errors: string[] = [];

  for (const channel of channels) {
    try {
      await sendNotification(channel, payload);
    } catch (err) {
      errors.push(
        `${channel.type}:${channel.target} - ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return errors;
}
