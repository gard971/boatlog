const prisma = require("../db");
const { resend } = require("../email/resendClient");
const { renderServiceDigestEmail } = require("../email/serviceDigestTemplate");

function parseRecipients() {
  const raw = (process.env.MAIL_TO || "").trim();
  if (!raw) throw new Error("MAIL_TO mangler (kommaseparert).");
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("no-NO");
}

function daysBetween(a, b) {
  const ms = (b.getTime() - a.getTime());
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

async function sendServiceDigestEmail({ overdue, dueSoon }) {
 const to = parseRecipients();
  const from = process.env.MAIL_FROM;
  const baseUrl = (process.env.MAIL_BASE_URL || "").replace(/\/$/, "");

  const subject = `BoatLog: ${overdue.length} forfalt · ${dueSoon.length} nærmer seg`;

  const html = renderServiceDigestEmail({ overdue, dueSoon, baseUrl });

  // fallback tekst (nice å ha)
  const textLines = [];
  textLines.push(`BoatLog · Servicepåminnelse`);
  textLines.push(`${overdue.length} forfalt · ${dueSoon.length} nærmer seg`);
  textLines.push("");
  for (const t of overdue) textLines.push(`FORFALT: ${t.title} (${new Date(t.dueAt).toLocaleDateString("no-NO")}) ${baseUrl}/todos/${t.id}`);
  for (const t of dueSoon) textLines.push(`NÆRMER SEG: ${t.title} (${new Date(t.dueAt).toLocaleDateString("no-NO")}) ${baseUrl}/todos/${t.id}`);

  await resend.emails.send({
    from,
    to,
    subject,
    html,
    text: textLines.join("\n"),
  });
}

// Main job
async function runServiceNotifications() {
  const soonDays = Number(process.env.SERVICE_SOON_DAYS || 14);
  const now = new Date();
  const soon = new Date(Date.now() + soonDays * 24 * 60 * 60 * 1000);

  // Kun åpne service-instans-todos
  const candidates = await prisma.todo.findMany({
    where: {
      servicePlanId: { not: null },
      status: "TODO",
      dueAt: { not: null },
    },
    orderBy: { dueAt: "asc" },
  });

  const overdue = candidates.filter(t => t.dueAt < now);
  const dueSoon = candidates.filter(t => t.dueAt >= now && t.dueAt <= soon);

  // Ikke spam: hvis ingenting, gjør ingenting
  if (overdue.length === 0 && dueSoon.length === 0) return { sent: false };

  // Idempotency: vi logger per todo+kind slik at samme TODO ikke varsles to ganger
  // Vi gjør dette i en transaction for å unngå race conditions.
  const toNotifyOverdue = [];
  const toNotifySoon = [];

  await prisma.$transaction(async (tx) => {
    // OVERDUE
    for (const t of overdue) {
      const exists = await tx.serviceNotification.findUnique({
        where: { todoId_kind: { todoId: t.id, kind: "OVERDUE" } },
      });
      if (!exists) {
        await tx.serviceNotification.create({
          data: { todoId: t.id, kind: "OVERDUE" },
        });
        toNotifyOverdue.push(t);
      }
    }

    // DUE_SOON
    for (const t of dueSoon) {
      const exists = await tx.serviceNotification.findUnique({
        where: { todoId_kind: { todoId: t.id, kind: "DUE_SOON" } },
      });
      if (!exists) {
        await tx.serviceNotification.create({
          data: { todoId: t.id, kind: "DUE_SOON" },
        });
        toNotifySoon.push(t);
      }
    }
  });

  // Hvis alle var allerede varslet, ikke send mail
  if (toNotifyOverdue.length === 0 && toNotifySoon.length === 0) {
    return { sent: false, reason: "already_notified" };
  }

  await sendServiceDigestEmail({ overdue: toNotifyOverdue, dueSoon: toNotifySoon });
  return { sent: true, overdue: toNotifyOverdue.length, dueSoon: toNotifySoon.length };
}

module.exports = { runServiceNotifications };
