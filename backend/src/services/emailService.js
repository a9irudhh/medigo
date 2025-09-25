import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // You can change this to your preferred email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD // Use App Password for Gmail
        }
    });
};

/**
 * Send email verification OTP
 * @param {string} email 
 * @param {string} firstName 
 * @param {string} otp 
 */
export const sendVerificationEmail = async (email, firstName, otp) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'MediGo',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Verify Your Email - MediGo',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification - MediGo</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                        .header { text-align: center; color: #2c5aa0; margin-bottom: 30px; }
                        .otp-code { background: #2c5aa0; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 3px; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to MediGo!</h1>
                            <p>Your AI-Powered Medical Appointment Booking System</p>
                        </div>
                        
                        <p>Hi <strong>${firstName}</strong>,</p>
                        
                        <p>Thank you for registering with MediGo! To complete your account setup, please verify your email address using the OTP below:</p>
                        
                        <div class="otp-code">${otp}</div>
                        
                        <div class="warning">
                            <strong>Important:</strong>
                            <ul>
                                <li>This OTP is valid for 10 minutes only</li>
                                <li>Do not share this OTP with anyone</li>
                                <li>If you didn't request this, please ignore this email</li>
                            </ul>
                        </div>
                        
                        <p>Once verified, you'll be able to:</p>
                        <ul>
                            <li>Book appointments with our AI assistant</li>
                            <li>Manage your medical history</li>
                            <li>Receive appointment reminders</li>
                            <li>Access personalized healthcare recommendations</li>
                        </ul>
                        
                        <div class="footer">
                            <p>Best regards,<br>The MediGo Team</p>
                            <hr>
                            <p><small>This is an automated email. Please do not reply to this email.</small></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email verification OTP sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new ApiError(500, 'Failed to send verification email');
    }
};

/**
 * Send password reset OTP
 * @param {string} email 
 * @param {string} firstName 
 * @param {string} otp 
 */
export const sendPasswordResetEmail = async (email, firstName, otp) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'MediGo Security',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Password Reset OTP - MediGo',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset - MediGo</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                        .header { text-align: center; color: #dc3545; margin-bottom: 30px; }
                        .otp-code { background: #dc3545; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 3px; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .security-notice { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #721c24; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                            <p>MediGo Security Team</p>
                        </div>
                        
                        <p>Hi <strong>${firstName}</strong>,</p>
                        
                        <p>We received a request to reset your password for your MediGo account. Use the OTP below to reset your password:</p>
                        
                        <div class="otp-code">${otp}</div>
                        
                        <div class="security-notice">
                            <strong>Security Notice:</strong>
                            <ul>
                                <li>This OTP is valid for 15 minutes only</li>
                                <li>Never share this OTP with anyone</li>
                                <li>If you didn't request this password reset, please ignore this email</li>
                                <li>Consider changing your password regularly for security</li>
                            </ul>
                        </div>
                        
                        <p>If you continue to have issues accessing your account, please contact our support team.</p>
                        
                        <div class="footer">
                            <p>Best regards,<br>The MediGo Security Team</p>
                            <hr>
                            <p><small>This is an automated security email. Please do not reply to this email.</small></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset OTP sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw new ApiError(500, 'Failed to send password reset email');
    }
};

/**
 * Send password change confirmation
 * @param {string} email 
 * @param {string} firstName 
 */
export const sendPasswordChangeConfirmationEmail = async (email, firstName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'MediGo Security',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Password Changed Successfully - MediGo',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Changed - MediGo</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                        .header { text-align: center; color: #28a745; margin-bottom: 30px; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #155724; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Changed Successfully</h1>
                            <p>MediGo Security Team</p>
                        </div>
                        
                        <p>Hi <strong>${firstName}</strong>,</p>
                        
                        <div class="success">
                            <strong>Success!</strong> Your password has been changed successfully.
                        </div>
                        
                        <p>Your MediGo account password was updated on ${new Date().toLocaleString()}.</p>
                        
                        <p>If you did not make this change, please contact our support team immediately.</p>
                        
                        <p>For your security:</p>
                        <ul>
                            <li>Keep your password confidential</li>
                            <li>Use a strong, unique password</li>
                            <li>Enable two-factor authentication if available</li>
                        </ul>
                        
                        <div class="footer">
                            <p>Best regards,<br>The MediGo Security Team</p>
                            <hr>
                            <p><small>This is an automated security email. Please do not reply to this email.</small></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password change confirmation sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send password change confirmation:', error);
        // Don't throw error for confirmation emails
        return null;
    }
};

/**
 * Send welcome email after successful verification
 * @param {string} email 
 * @param {string} firstName 
 */
export const sendWelcomeEmail = async (email, firstName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'MediGo',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Welcome to MediGo - Your AI Health Assistant',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to MediGo</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                        .header { text-align: center; color: #2c5aa0; margin-bottom: 30px; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2c5aa0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to MediGo, ${firstName}!</h1>
                            <p>Your AI-Powered Medical Assistant</p>
                        </div>
                        
                        <p>Congratulations! Your email has been verified and your MediGo account is now active.</p>
                        
                        <h3>What can you do now?</h3>
                        
                        <div class="feature">
                            <strong>🤖 AI Health Assistant</strong><br>
                            Describe your symptoms and get intelligent doctor recommendations
                        </div>
                        
                        <div class="feature">
                            <strong>📅 Easy Booking</strong><br>
                            Book appointments with the right specialists instantly
                        </div>
                        
                        <div class="feature">
                            <strong>📋 Health Records</strong><br>
                            Manage your medical history and track your health
                        </div>
                        
                        <div class="feature">
                            <strong>🔔 Smart Reminders</strong><br>
                            Never miss an appointment with our reminder system
                        </div>
                        
                        <p>Ready to get started? Log in to your account and experience the future of healthcare booking!</p>
                        
                        <div class="footer">
                            <p>Best regards,<br>The MediGo Team</p>
                            <hr>
                            <p><small>Need help? Contact our support team anytime.</small></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw error for welcome emails
        return null;
    }
};
