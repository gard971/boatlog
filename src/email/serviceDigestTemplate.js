function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("no-NO");
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function buildItemRow({ title, cycleNumber, dueAt, url, badgeText, badgeType }) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);

  const badgeBg =
    badgeType === "overdue" ? "#FEE2E2" :
    badgeType === "soon" ? "#FEF3C7" :
    "#E5E7EB";

  const badgeColor =
    badgeType === "overdue" ? "#991B1B" :
    badgeType === "soon" ? "#92400E" :
    "#374151";

  const cycle = cycleNumber ? ` #${cycleNumber}` : "";

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E5E7EB;">
        <div style="font-size:15px;line-height:20px;color:#111827;font-weight:600;">
          ${safeTitle}${escapeHtml(cycle)}
        </div>
        <div style="margin-top:4px;font-size:13px;line-height:18px;color:#6B7280;">
          Forfall: <strong style="color:#111827;">${escapeHtml(formatDate(dueAt))}</strong>
        </div>
        <div style="margin-top:6px;">
          <a href="${safeUrl}" style="font-size:13px;color:#2563EB;text-decoration:none;">
            Åpne i BoatLog →
          </a>
        </div>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #E5E7EB;vertical-align:top;">
        <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-size:12px;font-weight:700;">
          ${escapeHtml(badgeText)}
        </span>
      </td>
    </tr>
  `;
}

function renderServiceDigestEmail({ overdue = [], dueSoon = [], baseUrl = "" }) {
  const now = new Date();

  const overdueRows = overdue.map(t => buildItemRow({
    title: t.title,
    cycleNumber: t.cycleNumber,
    dueAt: t.dueAt,
    url: `${baseUrl}/todos/${t.id}`,
    badgeText: "FORFALT",
    badgeType: "overdue",
  })).join("");

  const soonRows = dueSoon.map(t => {
    const days = daysBetween(now, new Date(t.dueAt));
    const badge = days <= 0 ? "I DAG" : `OM ${days} DAG${days === 1 ? "" : "ER"}`;
    return buildItemRow({
      title: t.title,
      cycleNumber: t.cycleNumber,
      dueAt: t.dueAt,
      url: `${baseUrl}/todos/${t.id}`,
      badgeText: badge,
      badgeType: "soon",
    });
  }).join("");

  const hasOverdue = overdue.length > 0;
  const hasSoon = dueSoon.length > 0;

  const preheader = `${overdue.length} forfalt · ${dueSoon.length} nærmer seg`;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>BoatLog Service</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F4F6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F3F4F6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="width:100%;max-width:640px;background:#FFFFFF;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
            <tr>
              <td style="padding:22px 24px;border-bottom:1px solid #E5E7EB;">
                <div style="font-size:18px;font-weight:800;color:#111827;">BoatLog · Servicepåminnelse</div>
                <div style="margin-top:6px;font-size:13px;color:#6B7280;">
                  ${escapeHtml(preheader)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 24px;">
                ${!hasOverdue && !hasSoon ? `
                  <div style="padding:14px 14px;border:1px solid #E5E7EB;border-radius:12px;background:#F9FAFB;color:#111827;font-size:14px;">
                    Ingen forfalte eller kommende servicepunkter akkurat nå 🎉
                  </div>
                ` : ""}

                ${hasOverdue ? `
                  <div style="margin-bottom:16px;">
                    <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:8px;">Forfalt</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      ${overdueRows}
                    </table>
                  </div>
                ` : ""}

                ${hasSoon ? `
                  <div style="margin-top:8px;">
                    <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:8px;">Nærmer seg</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      ${soonRows}
                    </table>
                  </div>
                ` : ""}

                <div style="margin-top:18px;padding-top:14px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:12px;line-height:18px;">
                  Denne e-posten er sendt automatisk fra BoatLog.
                  <br/>
                  Åpne serviceoversikten: <a href="${escapeHtml(baseUrl)}/service" style="color:#2563EB;text-decoration:none;">${escapeHtml(baseUrl)}/service</a>
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top:10px;color:#9CA3AF;font-size:12px;">
            © ${new Date().getFullYear()} BoatLog
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

module.exports = { renderServiceDigestEmail };
