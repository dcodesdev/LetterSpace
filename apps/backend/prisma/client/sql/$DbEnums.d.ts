export interface $DbEnums {}


export namespace $DbEnums {
  type CampaignStatus = "DRAFT" | "SCHEDULED" | "CREATING" | "SENDING" | "COMPLETED" | "CANCELLED"
  type MessageStatus = "QUEUED" | "PENDING" | "SENT" | "AWAITING_WEBHOOK" | "OPENED" | "CLICKED" | "FAILED" | "RETRYING" | "CANCELLED" | "COMPLAINED"
  type SmtpEncryption = "STARTTLS" | "SSL_TLS" | "NONE"
}
