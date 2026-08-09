export type DeliveryTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function renderMentorSessionAccepted(data: Record<string, unknown>): DeliveryTemplate {
  const mentorName = optionalString(data.mentor_name) ?? "A mentor";
  const scheduledFor = optionalString(data.scheduled_for);
  const meetingUrl = optionalString(data.meeting_url);
  const safeMeetingUrl = meetingUrl?.startsWith("https://") ? meetingUrl : null;
  const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
  const scheduledLabel =
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          timeZoneName: "short",
        }).format(scheduledDate)
      : null;

  const subject = `Mentorship accepted by ${mentorName}`;
  const textLines = [
    `${mentorName} has accepted your mentorship request.`,
    scheduledLabel ? `Scheduled for: ${scheduledLabel}` : null,
    safeMeetingUrl ? `Meeting link: ${safeMeetingUrl}` : null,
    "Sign in to Indus Orbit to view or manage the session: https://indusorbit.com/app/mentor",
  ].filter((line): line is string => Boolean(line));

  return {
    subject,
    text: textLines.join("\n\n"),
    html: [
      '<div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#18142f;line-height:1.6">',
      '<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#b75b12">Indus Orbit</p>',
      "<h2>Mentorship session accepted</h2>",
      `<p><strong>${escapeHtml(mentorName)}</strong> has accepted your mentorship request.</p>`,
      scheduledLabel ? `<p><strong>Scheduled for:</strong> ${escapeHtml(scheduledLabel)}</p>` : "",
      safeMeetingUrl
        ? `<p><strong>Meeting link:</strong> <a href="${escapeHtml(safeMeetingUrl)}">${escapeHtml(safeMeetingUrl)}</a></p>`
        : "",
      '<p><a href="https://indusorbit.com/app/mentor">Open mentorship in Indus Orbit</a></p>',
      "</div>",
    ].join(""),
  };
}

export function renderEmailTemplate(
  templateKey: string,
  templateData: Record<string, unknown>,
): DeliveryTemplate {
  if (templateKey === "mentor_session_accepted") {
    return renderMentorSessionAccepted(templateData);
  }
  throw new Error(`Unsupported email template: ${templateKey}`);
}
