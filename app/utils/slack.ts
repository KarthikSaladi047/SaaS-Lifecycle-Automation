import { WebClient } from "@slack/web-api";
import { broadCastSlackID } from "../constants/pcd";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface Region {
  fqdn: string;
  leaseDate: string;
  ownerEmail: string;
}

export async function sendBatchSlackMessage(
  environment: string,
  regions: Region[],
  daysBeforeExpiry: number
) {
  if (regions.length === 0) return;

  const uniqueMentions = new Set<string>();

  for (const region of regions) {
    try {
      const result = await slack.users.lookupByEmail({
        email: region.ownerEmail,
      });
      const userId = result.user?.id;
      uniqueMentions.add(userId ? `<@${userId}>` : region.ownerEmail);
    } catch {
      uniqueMentions.add(region.ownerEmail);
    }
  }

  const mentionLine = [...uniqueMentions].join(" ");

  const headerText =
    daysBeforeExpiry === 1
      ? `*PCD \`${environment}\` Regions expiring tomorrow 🚨*`
      : `*PCD \`${environment}\` Regions expiring in ${daysBeforeExpiry} days ⏰*`;

  const tableHeader = `FQDN                                  Owner                   Lease Date`;
  const divider = `──────────────────────────────────    ─────────────────────   ──────────`;
  const rows = regions.map(
    (r) => `${r.fqdn.padEnd(36)}  ${r.ownerEmail.padEnd(22)}  ${r.leaseDate}`
  );

  const tableBlock = "```" + [tableHeader, divider, ...rows].join("\n") + "```";

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: headerText,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: mentionLine,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: tableBlock,
      },
    },
  ];

  await slack.chat.postMessage({
    channel: broadCastSlackID,
    text: `PCD ${environment} regions expiring in ${daysBeforeExpiry} day(s)`, // fallback
    blocks,
  });
}
