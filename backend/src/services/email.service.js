const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    family: 4 // Force IPv4 to avoid IPv6 ENETUNREACH errors on some networks
});

exports.sendEmail = async (to, subject, text) => {
    // If credentials are removed, fallback to mock
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('--- 📧 MOCK EMAIL SENT (No Credentials) 📧 ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: \n${text}`);
        return Promise.resolve(true);
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        });
        console.log('✅ Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
};

exports.sendQuoteReceivedEmail = async (email, quoteId, details = {}) => {
    const trackingLink = `http://localhost:4200/track/${quoteId}`;
    const { serviceType = 'Service', postalCode = 'N/A', details: description = 'No details provided.' } = details;

    // Glassmorphism-inspired HTML Email
    const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #EC4899 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Quote Request Received!</h1>
                <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">We're finding the best vendors for you.</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px;">
                <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Hi there,<br><br>
                    Thanks for submitting your request. Local vendors will review your project and send you competitive quotes soon.
                </p>

                <!-- Request Details -->
                <div style="background: #F8FAFC; border-left: 4px solid #4F46E5; padding: 16px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #1E293B; font-size: 14px; text-transform: uppercase;">Request Details</h3>
                    <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;"><strong>Service:</strong> ${serviceType}</p>
                    <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;"><strong>Location:</strong> ${postalCode}</p>
                    <p style="margin: 0; color: #475569; font-size: 14px; font-style: italic;">"${description}"</p>
                </div>

                <!-- Quote ID Box -->
                <div style="background: #F1F5F9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 32px;">
                    <p style="color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 1px;">Your Quote ID</p>
                    <p style="color: #1E293B; font-size: 24px; font-family: monospace; font-weight: 700; margin: 0;">${quoteId}</p>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${trackingLink}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
                        Track Status
                    </a>
                </div>

                <p style="color: #94A3B8; font-size: 14px; text-align: center;">
                    Or visit <a href="${trackingLink}" style="color: #4F46E5;">${trackingLink}</a>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #94A3B8; font-size: 12px; margin: 0;">&copy; 2026 Quote Compare App. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    // Try sending HTML email via Nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            await transporter.sendMail({
                from: `"Quote Compare App" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'We received your quote request! 🚀',
                html: htmlContent,
                text: `Your request (${serviceType}) has been received. Track it here: ${trackingLink} (ID: ${quoteId})`
            });
            console.log('✅ HTML Email sent successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to send HTML email:', error);
            // Fallback handled below
        }
    }

    return exports.sendEmail(
        email,
        'We received your quote request!',
        `Your request (${serviceType}) has been received. Track it here: ${trackingLink} (ID: ${quoteId})`
    );
};

exports.sendNewQuoteAlertToVendors = async (postalCode, serviceType) => {
    // In reality, this would query vendors in that area
    console.log(`[Mock] Alerting vendors in ${postalCode} about new ${serviceType} job.`);
    return Promise.resolve(true);
};
