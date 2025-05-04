import { SmtpSettings } from "../../prisma/client"
import nodemailer from "nodemailer"

type SendMailOptions = {
  from: string
  to: string
  subject: string
  html?: string | null
  text?: string | null
}

interface Envelope {
  from: string
  to: string[]
}

interface SMTPResponse {
  accepted: string[]
  rejected: string[]
  ehlo: string[]
  envelopeTime: number
  messageTime: number
  messageSize: number
  response: string
  envelope: Envelope
  messageId: string
}

interface SendEmailResponse {
  success: boolean
  from: string
  messageId?: string
}

export class Mailer {
  private transporter: nodemailer.Transporter

  constructor(smtpSettings: SmtpSettings) {
    const startTls = {
      port: 587,
      secure: false,
      requireTLS: true,
    }

    const sslTls = {
      port: 465,
      secure: true,
    }

    const tlsOpts =
      smtpSettings.encryption === "STARTTLS"
        ? startTls
        : smtpSettings.encryption === "SSL_TLS"
          ? sslTls
          : { port: smtpSettings.port }

    this.transporter = nodemailer.createTransport({
      connectionTimeout: smtpSettings.timeout,
      host: smtpSettings.host,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      requireTLS: smtpSettings.secure,
      ...tlsOpts,
    })
  }

  async sendEmail(options: SendMailOptions): Promise<SendEmailResponse> {
    const result: SMTPResponse = await this.transporter.sendMail({
      to: [options.to],
      subject: options.subject,
      from: options.from,
      // TODO: Handle plain text
      text: options.text || undefined,
      html: options.html || undefined,
    })

    let response: SendEmailResponse = {
      success: false,
      messageId: result.messageId,
      from: options.from,
    }

    if (result.accepted.length > 0) {
      response.success = true
    } else if (result.rejected.length > 0) {
      response.success = false
    }

    return response
  }
}
