export interface TenantBrainProfile {
  brainName: string;
  brainPersona?: string | null;
  brainContext?: string | null;
  language: string;
}

export interface TenantBrandingProfile {
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
}
