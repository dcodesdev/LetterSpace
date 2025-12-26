import nodemailer from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"
import { SmtpSettings } from "../../prisma/client"
import { stripAngleBrackets } from "../utils/message-id"

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

type TransportOptions = SMTPTransport | SMTPTransport.Options | string

export class Mailer {
  private transporter: nodemailer.Transporter

  constructor(smtpSettings: SmtpSettings) {
    let transportOptions: TransportOptions = {
      host: smtpSettings.host,
      port: smtpSettings.port,
      connectionTimeout: smtpSettings.timeout,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
    }

    if (smtpSettings.encryption === "STARTTLS") {
      transportOptions = {
        ...transportOptions,
        port: smtpSettings.port || 587, // Default STARTTLS port
        secure: false, // Use STARTTLS
        requireTLS: true, // Require STARTTLS upgrade
      }
    } else if (smtpSettings.encryption === "SSL_TLS") {
      transportOptions = {
        ...transportOptions,
        port: smtpSettings.port || 465, // Default SSL/TLS port
        secure: true, // Use direct TLS connection
      }
    } else {
      // NONE encryption
      transportOptions = {
        ...transportOptions,
        port: smtpSettings.port || 25, // Default non-encrypted port
        secure: false,
        requireTLS: false, // Explicitly disable TLS requirement
        ignoreTLS: true, // Optionally ignore TLS advertised by server if needed
      }
    }

    this.transporter = nodemailer.createTransport(transportOptions)
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
      messageId: result.messageId
        ? stripAngleBrackets(result.messageId)
        : undefined,
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
