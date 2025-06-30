export const colorClasses: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
  purple: "bg-purple-600 hover:bg-purple-700",
  yellow: "bg-yellow-600 hover:bg-yellow-700",
};

export const environmentOptions = [
  { value: "", label: "Select Environment" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "qa", label: "QA" },
  { value: "dev", label: "Dev" },
];

export const envList = ["dev", "qa", "staging", "production"];

export const dbBackendOptions = [
  { value: "", label: "Select Database" },
  { value: "mysql", label: "Local MySQL" },
];

export const slackChannelLinks: Record<string, string> = {
  production: "https://platform9.slack.com/archives/C037R987G",
  staging: "https://platform9.slack.com/archives/C08GP881QSC",
  qa: "https://platform9.slack.com/archives/C08G0RZG1A6",
  dev: "https://platform9.slack.com/archives/C01E7254V9V",
};

export const tempusUrl = "https://tempus-prod.platform9.horse/api/v1/releases";

export const tagColors = [
  "bg-red-100 text-red-800",
  "bg-green-100 text-green-800",
  "bg-blue-100 text-blue-800",
  "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
];

export const tempus_urls: Record<string, string> = {
  production: "https://tempus-prod.platform9.horse",
  staging: "https://tempus-prod.platform9.horse",
  qa: "https://tempus-dev.platform9.horse",
  dev: "https://tempus-dev.platform9.horse",
};

export const bork_urls: Record<string, string> = {
  production: "https://bork.app.pcd.platform9.com",
  staging: "https://bork.app.staging-pcd.platform9.com",
  qa: "https://bork.app.qa-pcd.platform9.com",
  dev: "https://bork.app.dev-pcd.platform9.com",
};

export const Tag_suggestions = [
  "Reproducer",
  "Sales",
  "DevOps",
  "SA",
  "SRE",
  "QA",
  "Dev",
  "Develop",
  "Delete",
  "Don't Delete",
  "Marketing",
  "Support",
  "POC",
  "Test Environment",
  "PCD-V",
  "PCD-K",
  "Training",
];

export const CHARTS_CACHE_TTL = 60 * 60 * 1000;

export const log = {
  info: (msg: string) =>
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg: string) =>
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg: string) =>
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`),
  success: (msg: string) =>
    console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`),
};

export const broadCastSlackID = "C0935NGUC6B";
