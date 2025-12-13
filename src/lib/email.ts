import nodemailer from 'nodemailer';

// Create transporter for sending emails
const createTransporter = () => {
  // Check if all required environment variables are set
  const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing email environment variables: ${missingVars.join(', ')}`);
    console.warn('📧 Email service will be disabled until configured.');
    return null;
  }

  // Fix for Next.js Turbopack - use proper import
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  
  return transporter;
};

// Email template for reset password
const getResetPasswordEmailTemplate = (resetLink: string, userName: string) => {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #c026d3 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🔐 Đặt lại mật khẩu
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 14px;">
                CLB Sinh viên 5 Tốt TDMU
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Xin chào <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px auto; border-collapse: collapse;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;"
                       target="_blank">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; line-height: 1.6;">
                Hoặc copy và paste link sau vào trình duyệt:
              </p>
              <p style="margin: 8px 0 0; word-break: break-all;">
                <a href="${resetLink}" style="color: #9333ea; text-decoration: none; font-size: 13px;">${resetLink}</a>
              </p>

              <!-- Security Notice -->
              <div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  ⚠️ <strong>Lưu ý bảo mật:</strong><br>
                  Link này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                © 2025 CLB Sinh viên 5 Tốt TDMU
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Email này được gửi tự động, vui lòng không reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Plain text version for email clients that don't support HTML
const getResetPasswordPlainText = (resetLink: string, userName: string) => {
  return `
Xin chào ${userName},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Nhấn vào link sau để đặt lại mật khẩu (link sẽ hết hạn sau 1 giờ):
${resetLink}

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

---
© 2025 CLB Sinh viên 5 Tốt TDMU
Email này được gửi tự động, vui lòng không reply.
  `;
};

/**
 * Send reset password email
 * @param email - Recipient email address
 * @param resetLink - Password reset link
 * @param userName - User's name (optional)
 * @returns Promise<boolean> - true if email sent successfully
 */
export const sendResetPasswordEmail = async (
  email: string,
  resetLink: string,
  userName: string = 'Bạn'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('⚠️ Email service not configured. Skipping email send.');
      console.log(`📧 Reset link for ${email}: ${resetLink}`);
      return { 
        success: false, 
        error: 'Email service not configured. Check environment variables.' 
      };
    }

    const mailOptions = {
      from: {
        name: 'CLB Sinh viên 5 Tốt TDMU',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@tdmu.edu.vn'
      },
      to: email,
      subject: '🔐 Đặt lại mật khẩu - CLB Sinh viên 5 Tốt TDMU',
      html: getResetPasswordEmailTemplate(resetLink, userName),
      text: getResetPasswordPlainText(resetLink, userName),
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

/**
 * Verify email configuration
 * @returns Promise<boolean> - true if email service is properly configured
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return false;
    }

    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error);
    return false;
  }
};

