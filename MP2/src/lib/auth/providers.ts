export type AuthProviderConfig = {
  id: "email_password" | "google" | "microsoft";
  label: string;
  enabled: boolean;
  mode: "password" | "oauth";
};

export const authProviders: AuthProviderConfig[] = [
  {
    id: "email_password",
    label: "Email and Password",
    enabled: true,
    mode: "password"
  },
  {
    id: "google",
    label: "Google SSO",
    enabled: true,
    mode: "oauth"
  },
  {
    id: "microsoft",
    label: "Microsoft SSO",
    enabled: true,
    mode: "oauth"
  }
];
