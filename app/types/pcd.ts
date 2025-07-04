export interface APIItem {
  customer_shortname: string;
  region_name: string;
  fqdn: string;
  namespace: string;
  task_state: string;
  deployed_at: string;
  cluster: string;
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

export interface CustomerItem {
  shortname: string;
  admin_email: string;
}

export interface ClusterItem {
  fqdn: string;
  accepting: boolean;
}

export interface DataPlane {
  dataplane: string;
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
  leaseDuration: string;
  cluster: string;
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
  cluster: string;
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

export type DeployRegionPayload = {
  admin_password: string;
  aim: string;
  dbbackend: string;
  regionname: string;
  use_du_specific_le_http_cert?: boolean;
  options: {
    multi_region: boolean | string;
    skip_components: string;
    chart_url: string;
  };
};

export interface Chart {
  version: string;
  location: string;
}

export interface GoogleIdToken {
  email?: string;
  email_verified?: boolean;
  hd?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

// for cleanup
export interface BorkRegion {
  customer_shortname: string;
  region_name: string;
  namespace: string;
  metadata: {
    lease_date?: string;
    owner?: string;
    lease_counter?: string;
  };
}

export interface BorkCustomer {
  shortname: string;
  admin_email: string;
}

export type ExpiringRegion = {
  fqdn: string;
  leaseDate: string;
  ownerEmail: string;
};
