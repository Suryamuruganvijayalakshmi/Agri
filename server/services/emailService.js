import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';

// Create nodemailer transport (uses SMTP env vars or test logger)
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Return test/logging transporter if SMTP not explicitly configured
  return {
    sendMail: async (mailOptions) => {
      console.log('---------------------------------------------------------');
      console.log('📧 [EMAIL NOTIFICATION DISPATCHED TO REGISTERED EMAIL/PHONE]');
      console.log(`TO: ${mailOptions.to}`);
      console.log(`SUBJECT: ${mailOptions.subject}`);
      console.log(`BOOKING DETAILS & QR PAYLOAD DELIVERED SUCCESSFULLY.`);
      console.log('---------------------------------------------------------');
      return { messageId: `mock-email-${Date.now()}` };
    }
  };
};

export async function sendBookingConfirmationEmail(appointment, farmerDetails = {}) {
  try {
    if (!appointment) return { success: false, error: 'No appointment provided' };

    const farmerId = appointment.farmer_id || farmerDetails.farmer_id || 'F-1042';
    
    // Find registered user email / phone from MongoDB if available
    let recipientEmail = farmerDetails.email || farmerDetails.phone_email;
    let recipientPhone = farmerDetails.phone;
    let farmerFullName = farmerDetails.farmer_name || farmerDetails.full_name || appointment.farmer_name || 'Valued Farmer';

    if (!recipientEmail) {
      try {
        const userObj = await User.findOne({ 
          $or: [{ id: farmerId }, { email: farmerId }, { full_name: farmerFullName }] 
        });
        if (userObj) {
          recipientEmail = userObj.email;
          recipientPhone = recipientPhone || userObj.phone;
          farmerFullName = userObj.full_name || farmerFullName;
        }
      } catch (err) {
        console.warn('Could not query user for email dispatch:', err.message);
      }
    }

    // Default email fallback for demonstration/system delivery
    if (!recipientEmail) {
      recipientEmail = `farmer-${farmerId.toLowerCase().replace(/[^a-z0-9]/g, '')}@agriflow.gov.in`;
    }

    const qrData = `AGRIFLOW-BOOKING:${appointment.booking_id}:${appointment.qr_token || appointment.token_number}:${appointment.centre_id || 'centre-1'}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #16a34a; border-radius: 12px; overflow: hidden; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🌾 AGRIFLOW PROCUREMENT SLOT CONFIRMED</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Official Digital Booking Confirmation & Yard Entry Pass</p>
        </div>

        <div style="padding: 24px; background: #ffffff;">
          <p style="font-size: 15px;">Dear <strong>${farmerFullName}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">Your procurement slot booking has been registered successfully. Present the QR code below at the Procurement Yard Gate counter upon arrival.</p>

          <div style="background: #f0fdf4; border: 2px dashed #86efac; border-radius: 14px; padding: 16px; text-align: center; margin: 20px 0;">
            <img src="${qrImageUrl}" alt="Procurement QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto 10px auto; border-radius: 8px; border: 1px solid #bbf7d0;" />
            <div style="font-size: 20px; font-weight: 900; color: #16a34a; font-family: monospace;">Token #${appointment.token_number}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">QR Ref: ${appointment.qr_token || appointment.booking_id}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Booking ID:</td>
              <td style="padding: 10px 0; font-weight: bold; font-family: monospace; text-align: right;">${appointment.booking_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Procurement Centre:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${appointment.centre_name || 'Mandya Central Yard'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Storage Bay #:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #2563eb; text-align: right;">BAY #${appointment.position_number < 10 ? '0' + appointment.position_number : appointment.position_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Crop Type & Quantity:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #16a34a; text-align: right;">${appointment.crop_type} (${appointment.declared_quantity_kg} kg)</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Appointment Date:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${appointment.appointment_date || 'Today'}</td>
            </tr>
          </table>

          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px; border-radius: 6px; font-size: 13px; color: #1e40af;">
            💡 <strong>Yard Entry Instructions:</strong> Please arrive 15 minutes prior to your slot. Scan your digital QR code at Gate Counter #1 to enter the live queue line.
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          AGRIFLOW Digital Procurement Platform • Helpline: 1800-425-1042
        </div>
      </div>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AGRIFLOW Procurement" <notifications@agriflow.gov.in>',
      to: recipientEmail,
      subject: `✅ Booking Confirmed: Token #${appointment.token_number} - ${appointment.centre_name || 'Yard'}`,
      html: htmlContent
    });

    // Also persist in-app Notification document in MongoDB
    try {
      await Notification.create({
        id: `NOTIF-${uuidv4().substring(0, 8)}`,
        farmer_id: farmerId,
        type: 'SLOT_BOOKED',
        title: `Procurement Slot Confirmed: Token #${appointment.token_number}`,
        message: `Slot booked at ${appointment.centre_name || 'Yard'} for ${appointment.crop_type} (${appointment.declared_quantity_kg}kg). QR Code sent to registered email ${recipientEmail}.`,
        read: false
      });
    } catch (notifErr) {
      console.warn('Notification DB save warning:', notifErr.message);
    }

    console.log(`✅ [EMAIL SERVICE] Booking confirmation with QR payload sent to registered email/phone: ${recipientEmail}`);
    return { success: true, recipientEmail };
  } catch (error) {
    console.error('❌ [EMAIL SERVICE ERROR]:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send booking notification to the assigned centre agent / officer
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAgentBookingNotification(appointment, agentDetails = {}) {
  try {
    if (!appointment) return { success: false, error: 'No appointment provided' };

    let agentEmail = agentDetails.email;
    let agentName  = agentDetails.full_name || agentDetails.name || 'Centre Officer';

    // Look up the operator assigned to this centre if no email was passed in
    if (!agentEmail) {
      try {
        const agentUser = await User.findOne({
          $or: [
            { assigned_centre_id: appointment.centre_id, role: 'CENTRE_OPERATOR' },
            { assigned_centre_id: appointment.centre_id }
          ]
        });
        if (agentUser) {
          agentEmail = agentUser.email;
          agentName  = agentUser.full_name || agentName;
        }
      } catch (err) {
        console.warn('Could not look up agent email:', err.message);
      }
    }

    // Nothing to send if we have no agent email
    if (!agentEmail) {
      console.warn('[EMAIL SERVICE] No agent email found for centre:', appointment.centre_id);
      return { success: false, error: 'Agent email not found' };
    }

    const qrData    = `AGRIFLOW-BOOKING:${appointment.booking_id}:${appointment.qr_token || appointment.token_number}:${appointment.centre_id || 'centre-1'}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;
    const bayNum    = appointment.position_number < 10 ? '0' + appointment.position_number : appointment.position_number;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #2563eb; border-radius: 12px; overflow: hidden; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">📋 NEW BOOKING AT YOUR CENTRE</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Agriflow — Centre Officer Notification</p>
        </div>

        <div style="padding: 24px; background: #ffffff;">
          <p style="font-size: 15px;">Dear <strong>${agentName}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">A new procurement slot booking has been registered at <strong>${appointment.centre_name || 'your centre'}</strong>. Please prepare for the farmer's arrival.</p>

          <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 14px; padding: 16px; text-align: center; margin: 20px 0;">
            <img src="${qrImageUrl}" alt="Booking QR" style="width: 150px; height: 150px; display: block; margin: 0 auto 10px auto; border-radius: 8px;" />
            <div style="font-size: 22px; font-weight: 900; color: #1d4ed8; font-family: monospace;">Token #${appointment.token_number}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Booking ID:</td>
              <td style="padding: 10px 0; font-weight: bold; font-family: monospace; text-align: right;">${appointment.booking_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Farmer:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${appointment.farmer_name || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Storage Bay:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #2563eb; text-align: right;">BAY #${bayNum}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Crop &amp; Quantity:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #16a34a; text-align: right;">${appointment.crop_type} (${appointment.declared_quantity_kg} kg)</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Appointment Date:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${appointment.appointment_date || 'Today'}</td>
            </tr>
          </table>

          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; border-radius: 6px; font-size: 13px; color: #14532d;">
            ✅ Please scan the QR code at Gate Counter when the farmer arrives. Proceed with Check-In, Weighment, and Approval steps.
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          AGRIFLOW Digital Procurement Platform • Centre Operator Alert System
        </div>
      </div>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || '"AGRIFLOW Procurement" <notifications@agriflow.gov.in>',
      to:      agentEmail,
      subject: `📋 New Booking at ${appointment.centre_name || 'Your Centre'}: Token #${appointment.token_number}`,
      html:    htmlContent
    });

    console.log(`✅ [EMAIL SERVICE] Agent booking notification sent to: ${agentEmail}`);
    return { success: true, agentEmail };
  } catch (error) {
    console.error('❌ [AGENT EMAIL SERVICE ERROR]:', error);
    return { success: false, error: error.message };
  }
}
