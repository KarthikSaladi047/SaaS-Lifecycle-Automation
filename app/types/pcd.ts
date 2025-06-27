export interface APIItem {
  customer_shortname: string;
  region_name: string;
  fqdn: string;
  namespace: string;
  task_state: string;
  deployed_at: string;
  options?: {
    chart_url?: string;
  };
  metadata?: {
    use_du_specific_le_http_cert?: string;
    owner?: string;
    lease_date?: string;
    lease_counter?: string;
    tags?: string;
  };
}

export interface FormData {
  environment: string;
  shortName: string;
  adminEmail: string;
  adminPassword: string;
  regionName: string;
  dbBackend: string;
  charturl: string;
  leaseDate: string;
  use_du_specific_le_http_cert: string;
  userEmail: string;
  note: string;
  token: string;
  tags: string;
}

export type Step =
  | "select"
  | "create"
  | "addRegion"
  | "deleteRegion"
  | "updateLease"
  | "upgrade";

export interface Chart {
  version: string;
  location: string;
}

export interface GroupedData {
  customer: string;
  regions: Region[];
}

export type Region = {
  region_name: string;
  fqdn: string;
  namespace: string;
  task_state: string;
  deployed_at: string;
  chart_url: string;
  owner: string;
  use_du_specific_le_http_cert: string;
  lease_date: string;
  lease_counter: string;
  tags: string;
};

export interface AdminEmail {
  shortname: string;
  admin_email: string;
}

export interface Artifact {
  artifact_type: string;
  location: string;
}

export interface Release {
  version: string;
  artifacts: Artifact[];
}

export interface ReleaseResponse {
  releases: Release[];
}

export interface EnvironmentOption {
  value: string;
  label: string;
}
