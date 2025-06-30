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

  // Create CSV content
  const csvHeader = "FQDN,Owner Email,Lease Date\n";
  const csvRows = regions
    .map((r) => `${r.fqdn},${r.ownerEmail},${r.leaseDate}`)
    .join("\n");
  const csvContent = csvHeader + csvRows;

  // Upload using uploadV2
  await slack.files.uploadV2({
    file: Buffer.from(csvContent),
    filename: `${environment}_expiring_regions.csv`,
    title: `Regions expiring in ${daysBeforeExpiry} day(s)`,
    alt_text: `Expiring region list`,
    channel_id: broadCastSlackID,
    initial_comment: `${mentionLine}\n\n*PCD \`${environment}\` Regions expiring in ${daysBeforeExpiry} day(s) 🚨*`,
  });
}
