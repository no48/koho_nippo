import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// SMTP設定をDBから取得
async function getSmtpSettings() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "smtpHost",
          "smtpPort",
          "smtpSecure",
          "smtpUser",
          "smtpPassword",
          "smtpFromEmail",
          "smtpFromName",
          "companyName",
        ],
      },
    },
  });

  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return {
    host: settingsMap.smtpHost || process.env.GMAIL_USER ? "smtp.gmail.com" : "",
    port: parseInt(settingsMap.smtpPort || "587"),
    secure: settingsMap.smtpSecure === "true",
    user: settingsMap.smtpUser || process.env.GMAIL_USER || "",
    password: settingsMap.smtpPassword || process.env.GMAIL_APP_PASSWORD || "",
    fromEmail: settingsMap.smtpFromEmail || settingsMap.smtpUser || process.env.GMAIL_USER || "",
    fromName: settingsMap.smtpFromName || settingsMap.companyName || "",
  };
}

// トランスポーターを動的に作成
async function createTransporter() {
  const smtp = await getSmtpSettings();

  if (!smtp.host || !smtp.user || !smtp.password) {
    throw new Error("SMTP設定が完了していません。設定画面からSMTP設定を行ってください。");
  }

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });
}

type SendInvoiceEmailParams = {
  to: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: string;
  total: string;
  pdfBuffer: Buffer;
};

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  issueDate,
  total,
  pdfBuffer,
}: SendInvoiceEmailParams) {
  const smtp = await getSmtpSettings();
  const transporter = await createTransporter();

  const from = smtp.fromName
    ? `"${smtp.fromName}" <${smtp.fromEmail}>`
    : smtp.fromEmail;

  const mailOptions = {
    from,
    to,
    subject: `【請求書】${invoiceNumber} - ${new Date(issueDate).getFullYear()}年${new Date(issueDate).getMonth() + 1}月分`,
    html: `
      <p>${customerName} 御中</p>
      <p>いつもお世話になっております。</p>
      <p>請求書をお送りいたします。</p>
      <br/>
      <p>■ 請求書番号: ${invoiceNumber}</p>
      <p>■ 発行日: ${new Date(issueDate).toLocaleDateString("ja-JP")}</p>
      <p>■ 請求金額: ¥${parseInt(total).toLocaleString("ja-JP")}</p>
      <br/>
      <p>添付のPDFファイルをご確認ください。</p>
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      <br/>
      <p>何卒よろしくお願いいたします。</p>
    `,
    attachments: [
      {
        filename: `請求書_${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}

// テストメール送信
export async function sendTestEmail(to: string) {
  const smtp = await getSmtpSettings();
  const transporter = await createTransporter();

  const from = smtp.fromName
    ? `"${smtp.fromName}" <${smtp.fromEmail}>`
    : smtp.fromEmail;

  const mailOptions = {
    from,
    to,
    subject: "【テスト】メール設定の確認",
    html: `
      <p>このメールはSMTP設定のテストです。</p>
      <p>このメールが届いていれば、メール設定は正しく機能しています。</p>
      <br/>
      <p>送信元: ${from}</p>
      <p>SMTPホスト: ${smtp.host}</p>
      <p>ポート: ${smtp.port}</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}
