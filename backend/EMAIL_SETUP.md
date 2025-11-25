# Password Reset Email Configuration

This guide explains how to set up email functionality for password reset in the UCU Innovators Hub.

## Prerequisites

The password reset feature requires an SMTP email server to send reset emails to users.

## Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Google account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "UCU Innovators Hub"
   - Click "Generate"
   - Copy the 16-character password

3. **Update `.env` file**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=UCU Innovators Hub <your-gmail@gmail.com>
   FRONTEND_URL=http://localhost:5173
   ```

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Testing the Setup

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test password reset flow**
   - Navigate to `http://localhost:5173/login`
   - Click "Forgot Password? Reset Here"
   - Enter a valid user email
   - Check the email inbox for reset link
   - Click the link and reset password

## Troubleshooting

### Email not sending
- Check that SMTP credentials are correct in `.env`
- Verify 2FA and App Password are set up (for Gmail)
- Check backend console for error messages
- Ensure port 587 is not blocked by firewall

### Reset link not working
- Ensure `FRONTEND_URL` in `.env` matches your frontend URL
- Check that the link hasn't expired (1 hour validity)
- Verify the token in the URL is complete

### Database errors
- Run the backend to auto-sync the database schema
- Or manually add columns to Users table:
  ```sql
  ALTER TABLE Users ADD COLUMN resetPasswordToken VARCHAR(255);
  ALTER TABLE Users ADD COLUMN resetPasswordExpires DATETIME;
  ```

## Production Considerations

For production deployment:

1. **Use a dedicated email service**
   - SendGrid, Mailgun, Amazon SES, etc.
   - More reliable than personal Gmail accounts

2. **Update environment variables**
   - Set `FRONTEND_URL` to your production domain
   - Use secure SMTP credentials
   - Consider using SMTP_PORT=465 for SSL

3. **Email template customization**
   - Update sender name/email in `SMTP_FROM`
   - Customize email content in `authController.js`

## Security Notes

- Never commit `.env` file to version control
- App passwords are more secure than regular passwords
- Reset tokens expire after 1 hour
- Tokens are hashed before storing in database
- Email service should use TLS/SSL encryption
