export interface HealthLink {
  id: string;
  passcodeFailuresRemaining: number;
  active: boolean;
  managementToken: string;
  config: {
    exp: number;
    passcode: string;
  };
}
  
export interface HealthLinkFile {
  content: string;
  contentType: string;
}
