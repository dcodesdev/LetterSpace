export interface $DbEnums {}

export namespace $DbEnums {
  type CampaignStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "SENDING"
    | "COMPLETED"
    | "CANCELLED";
  type MessageStatus =
    | "QUEUED"
    | "PENDING"
    | "SENT"
    | "OPENED"
    | "CLICKED"
    | "FAILED"
    | "RETRYING";
  type SmtpEncryption = "STARTTLS" | "SSL_TLS" | "NONE";
}
