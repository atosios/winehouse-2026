<?php

namespace App\Services;

use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailService
{
    /**
     * Apply runtime mail configuration from database settings.
     */
    public static function configureMailer(?array $customConfig = null): array
    {
        $mailConfig = $customConfig ?? Setting::get('mail_config', []);
        $siteSettings = Setting::allSettings();

        $driver = $mailConfig['mail_driver'] ?? env('MAIL_MAILER', 'smtp');
        $host = $mailConfig['mail_host'] ?? env('MAIL_HOST', 'smtp.winehouse.gr');
        $port = (int) ($mailConfig['mail_port'] ?? env('MAIL_PORT', 587));
        $encryption = $mailConfig['mail_encryption'] ?? env('MAIL_ENCRYPTION', 'tls');
        if ($encryption === 'none' || $encryption === 'null' || empty($encryption)) {
            $encryption = null;
        }

        $username = !empty($mailConfig['mail_username']) ? $mailConfig['mail_username'] : env('MAIL_USERNAME', null);
        $password = !empty($mailConfig['mail_password']) ? $mailConfig['mail_password'] : env('MAIL_PASSWORD', null);

        // If either username or password is empty, don't supply credentials to prevent Symfony CRAM-MD5 auth crashes
        if (empty($username) || empty($password)) {
            $username = null;
            $password = null;
        }

        $fromAddress = !empty($mailConfig['mail_from_address'])
            ? trim($mailConfig['mail_from_address'])
            : (!empty($siteSettings['contact']['email']) ? trim($siteSettings['contact']['email']) : env('MAIL_FROM_ADDRESS', 'info@winehouse.gr'));
        
        $fromName = !empty($mailConfig['mail_from_name'])
            ? trim($mailConfig['mail_from_name'])
            : (!empty($siteSettings['name']) ? trim($siteSettings['name']) : env('MAIL_FROM_NAME', 'The Winehouse'));

        // Resolve destination admin notification mailbox
        $companyEmail = !empty($mailConfig['company_notification_email'])
            ? trim($mailConfig['company_notification_email'])
            : (!empty($siteSettings['contact']['email'])
                ? trim($siteSettings['contact']['email'])
                : (User::orderBy('id')->value('email') ?? $fromAddress));

        config([
            'mail.default' => $driver,
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $host,
            'mail.mailers.smtp.port' => $port,
            'mail.mailers.smtp.encryption' => $encryption,
            'mail.mailers.smtp.username' => $username,
            'mail.mailers.smtp.password' => $password,
            'mail.from.address' => $fromAddress,
            'mail.from.name' => $fromName,
        ]);

        if ($driver === 'log') {
            config([
                'mail.mailers.log.transport' => 'log',
                'mail.mailers.log.channel' => env('MAIL_LOG_CHANNEL', 'stack'),
            ]);
        }

        // Purge cached mail manager instances to ensure runtime settings are applied immediately
        try {
            Mail::purge();
        } catch (\Throwable $e) {
            // Ignore if mail manager not yet initialized
        }

        return [
            'driver' => $driver,
            'host' => $host,
            'port' => $port,
            'encryption' => $encryption,
            'username' => $username,
            'from_address' => $fromAddress,
            'from_name' => $fromName,
            'company_email' => $companyEmail,
            'notify_on_new_order' => $mailConfig['notify_on_new_order'] ?? true,
            'notify_on_new_message' => $mailConfig['notify_on_new_message'] ?? true,
            'send_customer_order_confirmation' => $mailConfig['send_customer_order_confirmation'] ?? true,
        ];
    }

    /**
     * Send test email to verify SMTP host & credentials.
     */
    public static function sendTestEmail(string $recipientEmail, ?array $customConfig = null): array
    {
        try {
            $cfg = self::configureMailer($customConfig);

            $subject = 'The Winehouse — Mail Server Test';
            $html = '
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fcfbfa; border: 1.5px solid #111111; color: #111111;">
                <div style="border-bottom: 2px solid #c84b31; padding-bottom: 15px; margin-bottom: 20px;">
                    <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; color: #111111;">The Winehouse</h1>
                    <p style="font-family: monospace; font-size: 11px; color: #c84b31; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">SMTP Connectivity Verified</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #333333;">This is a test message confirming that your mail hosting configuration for <strong>The Winehouse</strong> is active and functional.</p>
                <div style="background-color: #ffffff; border: 1px solid #e0deda; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; font-size: 12px;">
                    <div><strong>Driver:</strong> ' . htmlspecialchars($cfg['driver']) . '</div>
                    <div><strong>Host:</strong> ' . htmlspecialchars($cfg['host']) . ':' . htmlspecialchars((string) $cfg['port']) . '</div>
                    <div><strong>From:</strong> ' . htmlspecialchars($cfg['from_name']) . ' &lt;' . htmlspecialchars($cfg['from_address']) . '&gt;</div>
                    <div><strong>Admin Recipient:</strong> ' . htmlspecialchars($cfg['company_email']) . '</div>
                    <div><strong>Timestamp:</strong> ' . date('Y-m-d H:i:s') . ' UTC</div>
                </div>
                <p style="font-size: 12px; color: #777777; margin-top: 30px; border-top: 1px solid #e0deda; padding-top: 15px;">The Winehouse Independent Atelier • Automated Delivery Service</p>
            </div>';

            Mail::html($html, function ($message) use ($recipientEmail, $subject, $cfg) {
                $message->to($recipientEmail)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->subject($subject);
            });

            return ['success' => true, 'message' => "Test email successfully dispatched to {$recipientEmail}."];
        } catch (\Throwable $e) {
            Log::error('SMTP Test Email Failure: ' . $e->getMessage(), ['exception' => $e]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Notify company email when a guest submits a contact / inquiry message.
     */
    public static function notifyCompanyNewContact(ContactMessage $contactMessage): void
    {
        try {
            $cfg = self::configureMailer();
            if (empty($cfg['notify_on_new_message']) || empty($cfg['company_email'])) {
                Log::info('Contact message notification skipped (disabled in settings or no recipient email configured).');
                return;
            }

            // Support comma-separated or semicolon-separated recipient list
            $recipients = array_filter(array_map('trim', preg_split('/[,;]+/', $cfg['company_email'])));
            if (empty($recipients)) {
                return;
            }

            $subject = "[Website Inquiry] " . ($contactMessage->subject ?: 'Guest Message') . " — from " . $contactMessage->name;
            $formattedDate = $contactMessage->created_at ? $contactMessage->created_at->format('M d, Y H:i T') : date('M d, Y H:i T');

            $html = '
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px; background-color: #fcfbfa; border: 1.5px solid #111111; color: #111111; border-radius: 4px;">
                <div style="border-bottom: 2px solid #c84b31; padding-bottom: 16px; margin-bottom: 24px;">
                    <span style="background-color: #c84b31; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: bold; padding: 4px 8px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">New Inquiry Ingestion</span>
                    <h1 style="font-size: 22px; font-weight: 800; margin: 12px 0 4px 0; text-transform: uppercase; letter-spacing: -0.3px; color: #111111;">' . htmlspecialchars($contactMessage->subject ?: 'General Inquiry') . '</h1>
                    <p style="font-family: monospace; font-size: 11px; color: #777777; margin: 0;">The Winehouse Digital Atelier • Contact Submissions</p>
                </div>
                
                <div style="background-color: #ffffff; border: 1px solid #e2ded8; padding: 18px 20px; border-radius: 6px; margin-bottom: 22px;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse; line-height: 1.6;">
                        <tr>
                            <td style="padding: 5px 0; color: #777777; width: 90px; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">Sender:</td>
                            <td style="padding: 5px 0; font-weight: bold; color: #111111;">' . htmlspecialchars($contactMessage->name) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">Email:</td>
                            <td style="padding: 5px 0;"><a href="mailto:' . htmlspecialchars($contactMessage->email) . '" style="color: #c84b31; text-decoration: none; font-weight: bold;">' . htmlspecialchars($contactMessage->email) . '</a></td>
                        </tr>' .
                        ($contactMessage->phone ? '
                        <tr>
                            <td style="padding: 5px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">Phone:</td>
                            <td style="padding: 5px 0; font-family: monospace;"><a href="tel:' . htmlspecialchars($contactMessage->phone) . '" style="color: #111111; text-decoration: none;">' . htmlspecialchars($contactMessage->phone) . '</a></td>
                        </tr>' : '') . '
                        <tr>
                            <td style="padding: 5px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">Topic / Type:</td>
                            <td style="padding: 5px 0; font-weight: 600;">' . htmlspecialchars($contactMessage->project_type ?: $contactMessage->subject ?: 'General') . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">Received:</td>
                            <td style="padding: 5px 0; font-family: monospace; font-size: 12px; color: #555555;">' . $formattedDate . '</td>
                        </tr>' .
                        ($contactMessage->ip_address ? '
                        <tr>
                            <td style="padding: 5px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase; font-weight: bold;">IP Address:</td>
                            <td style="padding: 5px 0; font-family: monospace; font-size: 11px; color: #888888;">' . htmlspecialchars($contactMessage->ip_address) . '</td>
                        </tr>' : '') . '
                    </table>
                </div>

                <div style="margin-bottom: 25px;">
                    <div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Message Content:</div>
                    <div style="background-color: #ffffff; border-left: 3px solid #c84b31; border: 1px solid #e2ded8; padding: 20px; font-size: 14px; line-height: 1.65; color: #222222; white-space: pre-wrap; border-radius: 4px;">'
                        . nl2br(htmlspecialchars($contactMessage->message)) .
                    '</div>
                </div>

                <div style="text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e0deda;">
                    <a href="mailto:' . htmlspecialchars($contactMessage->email) . '?subject=Re: ' . rawurlencode($contactMessage->subject ?: 'The Winehouse Inquiry') . '" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 26px; font-family: monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border-radius: 3px; margin: 4px;">Reply Directly to ' . htmlspecialchars($contactMessage->name) . ' →</a>
                </div>

                <div style="font-size: 11px; color: #888888; text-align: center; margin-top: 24px;">
                    This message was securely logged in your Winehouse Admin Dashboard &bull; ID #' . $contactMessage->id . '
                </div>
            </div>';

            Mail::html($html, function ($message) use ($recipients, $subject, $cfg, $contactMessage) {
                $message->to($recipients)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($contactMessage->email, $contactMessage->name)
                        ->subject($subject);
            });

            Log::info("Dispatched company contact notification for message #{$contactMessage->id} to " . implode(', ', $recipients));
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch company contact notification email: ' . $e->getMessage(), [
                'exception' => $e,
                'message_id' => $contactMessage->id ?? null,
            ]);
        }
    }

    /**
     * Notify company email when a customer places a new online order.
     */
    public static function notifyCompanyNewOrder(Order $order): void
    {
        try {
            $cfg = self::configureMailer();
            if (empty($cfg['notify_on_new_order']) || empty($cfg['company_email'])) {
                return;
            }

            $recipients = array_filter(array_map('trim', preg_split('/[,;]+/', $cfg['company_email'])));
            if (empty($recipients)) {
                return;
            }

            $subject = "[New Order #{$order->order_number}] {$order->customer_name} — " . number_format($order->total, 2) . " {$order->currency}";

            $itemsRows = '';
            foreach ($order->items as $item) {
                $vintage = $item->vintage ? " ({$item->vintage})" : '';
                $itemsRows .= '
                <tr>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee;"><strong>' . htmlspecialchars($item->product_name) . '</strong>' . htmlspecialchars($vintage) . '</td>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee; text-align: center; font-family: monospace;">' . $item->quantity . '</td>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee; text-align: right; font-family: monospace;">' . number_format($item->subtotal, 2) . ' ' . $order->currency . '</td>
                </tr>';
            }

            $addr = $order->shipping_address ?? [];
            $addrStr = !empty($addr['street']) ? htmlspecialchars($addr['street'] . ', ' . ($addr['city'] ?? '') . ' ' . ($addr['postal_code'] ?? '') . ', ' . ($addr['country'] ?? '')) : 'Standard Delivery';

            $html = '
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fcfbfa; border: 1.5px solid #111111; color: #111111;">
                <div style="border-bottom: 2px solid #c84b31; padding-bottom: 15px; margin-bottom: 20px;">
                    <span style="background-color: #111111; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: bold; padding: 3px 8px; text-transform: uppercase;">Allocation Order Placed</span>
                    <h1 style="font-size: 22px; font-weight: 800; margin: 10px 0 0 0;">Order #' . htmlspecialchars($order->order_number) . '</h1>
                </div>

                <div style="background-color: #ffffff; border: 1px solid #e2ded8; padding: 15px; margin-bottom: 20px; font-size: 13px;">
                    <div><strong>Customer:</strong> ' . htmlspecialchars($order->customer_name) . ' (<a href="mailto:' . htmlspecialchars($order->customer_email) . '" style="color: #c84b31;">' . htmlspecialchars($order->customer_email) . '</a>)</div>' .
                    ($order->customer_phone ? '<div><strong>Phone:</strong> ' . htmlspecialchars($order->customer_phone) . '</div>' : '') . '
                    <div><strong>Delivery Address:</strong> ' . $addrStr . '</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2ded8; margin-bottom: 20px; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f5f3ef; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #666666;">
                            <th style="padding: 8px 10px; text-align: left;">Product</th>
                            <th style="padding: 8px 10px; text-align: center;">Qty</th>
                            <th style="padding: 8px 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>' . $itemsRows . '</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #666666;">Subtotal:</td>
                            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold;">' . number_format($order->subtotal, 2) . ' ' . $order->currency . '</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #666666;">Shipping:</td>
                            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold;">' . ($order->shipping_cost > 0 ? number_format($order->shipping_cost, 2) . ' ' . $order->currency : 'FREE') . '</td>
                        </tr>
                        <tr style="background-color: #fdfaf7;">
                            <td colspan="2" style="padding: 10px; text-align: right; font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase;">Total:</td>
                            <td style="padding: 10px; text-align: right; font-family: monospace; font-size: 15px; font-weight: bold; color: #c84b31;">' . number_format($order->total, 2) . ' ' . $order->currency . '</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="font-size: 12px; color: #777777; border-top: 1px solid #e0deda; padding-top: 15px;">
                    Order recorded in Winehouse Atelier Dashboard.
                </div>
            </div>';

            Mail::html($html, function ($message) use ($recipients, $subject, $cfg, $order) {
                $message->to($recipients)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($order->customer_email, $order->customer_name)
                        ->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch company order notification email: ' . $e->getMessage());
        }
    }

    /**
     * Send order confirmation & bank wire instructions to customer.
     */
    public static function sendCustomerOrderReceipt(Order $order): void
    {
        try {
            $cfg = self::configureMailer();
            if (empty($cfg['send_customer_order_confirmation']) || empty($order->customer_email)) {
                return;
            }

            $siteSettings = Setting::allSettings();
            $storeConfig = $siteSettings['store_config'] ?? [];

            $recipient = $order->customer_email;
            $subject = "Your Winehouse Cellar Allocation Order #{$order->order_number}";

            $itemsRows = '';
            foreach ($order->items as $item) {
                $vintage = $item->vintage ? " ({$item->vintage})" : '';
                $itemsRows .= '
                <tr>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee;"><strong>' . htmlspecialchars($item->product_name) . '</strong>' . htmlspecialchars($vintage) . '</td>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee; text-align: center; font-family: monospace;">' . $item->quantity . '</td>
                    <td style="padding: 8px 10px; border-bottom: 1px solid #eeeeee; text-align: right; font-family: monospace;">' . number_format($item->subtotal, 2) . ' ' . $order->currency . '</td>
                </tr>';
            }

            $bankInfo = '';
            if (!empty($storeConfig['bank_iban'])) {
                $bankInfo = '
                <div style="background-color: #f7f5f0; border: 1.5px solid #111111; padding: 18px; margin: 25px 0; border-radius: 4px;">
                    <div style="font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #c84b31; margin-bottom: 8px;">Bank Wire Settlement Instructions</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                        <div><strong>Bank:</strong> ' . htmlspecialchars($storeConfig['bank_name'] ?? 'National Bank') . '</div>
                        <div><strong>IBAN:</strong> <span style="font-family: monospace; font-weight: bold; background: #ffffff; padding: 2px 5px;">' . htmlspecialchars($storeConfig['bank_iban']) . '</span></div>' .
                        (!empty($storeConfig['bank_bic']) ? '<div><strong>BIC / SWIFT:</strong> ' . htmlspecialchars($storeConfig['bank_bic']) . '</div>' : '') . '
                        <div><strong>Beneficiary:</strong> ' . htmlspecialchars($storeConfig['bank_beneficiary'] ?? 'The Winehouse') . '</div>
                        <div style="margin-top: 8px; color: #c84b31; font-weight: bold;">Reference Code: <span style="font-family: monospace; font-size: 14px;">ORDER-' . htmlspecialchars($order->order_number) . '</span></div>
                    </div>
                </div>';
            }

            $html = '
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fcfbfa; border: 1.5px solid #111111; color: #111111;">
                <div style="border-bottom: 2px solid #c84b31; padding-bottom: 15px; margin-bottom: 20px;">
                    <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; margin: 0;">The Winehouse</h1>
                    <p style="font-family: monospace; font-size: 11px; color: #c84b31; margin: 4px 0 0 0; text-transform: uppercase;">Order Confirmation #' . htmlspecialchars($order->order_number) . '</p>
                </div>

                <p style="font-size: 14px; line-height: 1.6;">Dear ' . htmlspecialchars($order->customer_name) . ',</p>
                <p style="font-size: 14px; line-height: 1.6; color: #333333;">Thank you for reserving your cellar allocations with us. We have received your order and reserved your selected bottles.</p>

                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2ded8; margin: 20px 0; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f5f3ef; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #666666;">
                            <th style="padding: 8px 10px; text-align: left;">Bottle / Varietal</th>
                            <th style="padding: 8px 10px; text-align: center;">Qty</th>
                            <th style="padding: 8px 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>' . $itemsRows . '</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #666666;">Subtotal:</td>
                            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold;">' . number_format($order->subtotal, 2) . ' ' . $order->currency . '</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #666666;">Shipping:</td>
                            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold;">' . ($order->shipping_cost > 0 ? number_format($order->shipping_cost, 2) . ' ' . $order->currency : 'FREE') . '</td>
                        </tr>
                        <tr style="background-color: #fdfaf7;">
                            <td colspan="2" style="padding: 10px; text-align: right; font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase;">Total:</td>
                            <td style="padding: 10px; text-align: right; font-family: monospace; font-size: 15px; font-weight: bold; color: #c84b31;">' . number_format($order->total, 2) . ' ' . $order->currency . '</td>
                        </tr>
                    </tfoot>
                </table>' .

                $bankInfo . '

                <p style="font-size: 13px; line-height: 1.6; color: #555555;">If you have any questions regarding your cellar dispatch, please reply directly to this email or contact us at <a href="mailto:' . htmlspecialchars($cfg['from_address']) . '" style="color: #c84b31;">' . htmlspecialchars($cfg['from_address']) . '</a>.</p>
                <div style="font-size: 11px; color: #888888; border-top: 1px solid #e0deda; padding-top: 15px; margin-top: 30px;">
                    The Winehouse Independent Atelier • Curated Wines &amp; Slow Living
                </div>
            </div>';

            Mail::html($html, function ($message) use ($recipient, $subject, $cfg) {
                $message->to($recipient)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch customer order confirmation email: ' . $e->getMessage());
        }
    }

    /**
     * Get processed newsletter configuration array.
     */
    public static function getNewsletterConfig(?array $customConfig = null): array
    {
        return self::configureNewsletterMailer($customConfig);
    }

    /**
     * Configure runtime mail settings specifically for newsletters and bulk dispatches.
     */
    public static function configureNewsletterMailer(?array $customConfig = null): array
    {
        $newsletterConfig = $customConfig ?? Setting::get('newsletter_config', []);
        $mailConfig = Setting::get('mail_config', []);
        $siteSettings = Setting::allSettings();

        $useCustomSmtp = !empty($newsletterConfig['custom_smtp_enabled']);

        $driver = $useCustomSmtp
            ? ($newsletterConfig['mail_driver'] ?? 'smtp')
            : ($mailConfig['mail_driver'] ?? env('MAIL_MAILER', 'smtp'));

        $host = $useCustomSmtp
            ? ($newsletterConfig['smtp_host'] ?? env('MAIL_HOST', 'smtp.winehouse.gr'))
            : ($mailConfig['mail_host'] ?? env('MAIL_HOST', 'smtp.winehouse.gr'));

        $port = (int) ($useCustomSmtp
            ? ($newsletterConfig['smtp_port'] ?? 587)
            : ($mailConfig['mail_port'] ?? env('MAIL_PORT', 587)));

        $encryption = $useCustomSmtp
            ? ($newsletterConfig['smtp_encryption'] ?? 'tls')
            : ($mailConfig['mail_encryption'] ?? env('MAIL_ENCRYPTION', 'tls'));

        if ($encryption === 'none' || $encryption === 'null' || empty($encryption)) {
            $encryption = null;
        }

        $username = $useCustomSmtp
            ? (!empty($newsletterConfig['smtp_username']) ? $newsletterConfig['smtp_username'] : null)
            : (!empty($mailConfig['mail_username']) ? $mailConfig['mail_username'] : env('MAIL_USERNAME', null));

        $password = $useCustomSmtp
            ? (!empty($newsletterConfig['smtp_password']) ? $newsletterConfig['smtp_password'] : null)
            : (!empty($mailConfig['mail_password']) ? $mailConfig['mail_password'] : env('MAIL_PASSWORD', null));

        if (empty($username) || empty($password)) {
            $username = null;
            $password = null;
        }

        $fromAddress = !empty($newsletterConfig['newsletter_from_address'])
            ? trim($newsletterConfig['newsletter_from_address'])
            : (!empty($mailConfig['mail_from_address']) ? trim($mailConfig['mail_from_address']) : 'newsletter@winehouse.gr');

        $fromName = !empty($newsletterConfig['newsletter_from_name'])
            ? trim($newsletterConfig['newsletter_from_name'])
            : (!empty($siteSettings['name']) ? $siteSettings['name'] . ' Cellar Dispatches' : 'The Winehouse Cellar Dispatches');

        $replyTo = !empty($newsletterConfig['newsletter_reply_to'])
            ? trim($newsletterConfig['newsletter_reply_to'])
            : (!empty($siteSettings['contact']['email']) ? trim($siteSettings['contact']['email']) : $fromAddress);

        config([
            'mail.default' => $driver,
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $host,
            'mail.mailers.smtp.port' => $port,
            'mail.mailers.smtp.encryption' => $encryption,
            'mail.mailers.smtp.username' => $username,
            'mail.mailers.smtp.password' => $password,
            'mail.from.address' => $fromAddress,
            'mail.from.name' => $fromName,
        ]);

        if ($driver === 'log') {
            config([
                'mail.mailers.log.transport' => 'log',
                'mail.mailers.log.channel' => env('MAIL_LOG_CHANNEL', 'stack'),
            ]);
        }

        try {
            Mail::purge();
        } catch (\Throwable $e) {
            // Ignore
        }

        $companyLegal = !empty($newsletterConfig['company_legal_name'])
            ? trim($newsletterConfig['company_legal_name'])
            : (!empty($siteSettings['legalName']) ? trim($siteSettings['legalName']) : 'The Winehouse Fine Terroirs Single Member P.C.');

        $companyAddress = !empty($newsletterConfig['company_physical_address'])
            ? trim($newsletterConfig['company_physical_address'])
            : (!empty($siteSettings['contact']['address']['street'])
                ? trim($siteSettings['contact']['address']['street'] . ', ' . ($siteSettings['contact']['address']['city'] ?? '') . ' ' . ($siteSettings['contact']['address']['postalCode'] ?? '') . ', ' . ($siteSettings['contact']['address']['country'] ?? ''))
                : '14 Vasilissis Sofias Ave, Athens 106 74, Greece');

        $companyEmail = !empty($newsletterConfig['company_contact_email'])
            ? trim($newsletterConfig['company_contact_email'])
            : (!empty($siteSettings['contact']['email']) ? trim($siteSettings['contact']['email']) : 'info@winehouse.gr');

        $companyPhone = !empty($newsletterConfig['company_phone'])
            ? trim($newsletterConfig['company_phone'])
            : (!empty($siteSettings['contact']['phone']) ? trim($siteSettings['contact']['phone']) : '');

        $footerDisclaimer = !empty($newsletterConfig['footer_disclaimer'])
            ? trim($newsletterConfig['footer_disclaimer'])
            : 'You are receiving this communication because you opted in to The Winehouse Cellar Dispatches or provided consent on our website.';

        $privacyUrl = !empty($newsletterConfig['privacy_policy_url'])
            ? trim($newsletterConfig['privacy_policy_url'])
            : '/about';

        $frontendUrl = rtrim(env('APP_FRONTEND_URL', 'http://localhost:4200'), '/');

        return [
            'driver' => $driver,
            'host' => $host,
            'port' => $port,
            'encryption' => $encryption,
            'from_address' => $fromAddress,
            'from_name' => $fromName,
            'reply_to' => $replyTo,
            'company_legal_name' => $companyLegal,
            'company_physical_address' => $companyAddress,
            'company_contact_email' => $companyEmail,
            'company_phone' => $companyPhone,
            'footer_disclaimer' => $footerDisclaimer,
            'privacy_url' => str_starts_with($privacyUrl, 'http') ? $privacyUrl : $frontendUrl . '/' . ltrim($privacyUrl, '/'),
            'frontend_url' => $frontendUrl,
        ];
    }

    /**
     * Build standard high-end editorial HTML email with GDPR footer.
     */
    public static function buildNewsletterHtml(
        string $subject,
        ?string $title,
        string $content,
        ?string $previewText,
        string $unsubscribeUrl,
        array $cfg
    ): string {
        $preheaderHtml = !empty($previewText)
            ? '<div style="display:none;font-size:1px;color:#fcfbfa;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">' . htmlspecialchars($previewText) . '</div>'
            : '';

        $titleHtml = !empty($title)
            ? '<h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; margin: 16px 0 6px 0; color: #111111; line-height: 1.15;">' . htmlspecialchars($title) . '</h1>'
            : '';

        return '
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' . htmlspecialchars($subject) . '</title>
        </head>
        <body style="margin: 0; padding: 24px 12px; background-color: #ece7e1; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #111111; -webkit-font-smoothing: antialiased;">
            ' . $preheaderHtml . '
            <div style="max-width: 620px; margin: 0 auto; background-color: #fcfbfa; border: 1.5px solid #111111; border-radius: 4px; box-shadow: 4px 4px 0px 0px #111111; overflow: hidden;">
                
                <!-- Editorial Header -->
                <div style="background-color: #111111; color: #ffffff; padding: 24px 30px; border-bottom: 2px solid #c84b31;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: middle;">
                                <span style="font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #c84b31;">' . htmlspecialchars($cfg['from_name']) . '</span>
                                <div style="font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px; color: #ffffff;">The Winehouse</div>
                            </td>
                            <td style="text-align: right; vertical-align: middle;">
                                <span style="display: inline-block; background-color: #c84b31; color: #ffffff; font-family: monospace; font-size: 9px; font-weight: bold; padding: 3px 8px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">Atelier Gazette</span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Main Content Body -->
                <div style="padding: 32px 30px; font-size: 15px; line-height: 1.7; color: #222222;">
                    ' . $titleHtml . '
                    <div style="margin-top: 20px; font-size: 14px; line-height: 1.75; color: #2b2b2b;">
                        ' . $content . '
                    </div>
                </div>

                <!-- EU GDPR Mandatory Sender & Unsubscribe Legal Footer -->
                <div style="background-color: #f4f1ea; border-top: 1.5px solid #111111; padding: 24px 30px; font-size: 11px; line-height: 1.6; color: #666666;">
                    <div style="margin-bottom: 12px; font-weight: 500; color: #444444;">
                        ' . htmlspecialchars($cfg['footer_disclaimer']) . '
                    </div>
                    
                    <div style="margin-bottom: 14px; padding: 10px 12px; background-color: #ffffff; border: 1px solid #e0deda; border-radius: 3px; font-family: monospace; font-size: 10.5px; color: #444444;">
                        <div><strong>' . htmlspecialchars($cfg['company_legal_name']) . '</strong></div>
                        <div>' . htmlspecialchars($cfg['company_physical_address']) . '</div>
                        <div>Contact: <a href="mailto:' . htmlspecialchars($cfg['company_contact_email']) . '" style="color: #c84b31; text-decoration: none;">' . htmlspecialchars($cfg['company_contact_email']) . '</a>' .
                        ($cfg['company_phone'] ? ' &bull; ' . htmlspecialchars($cfg['company_phone']) : '') . '</div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #d5d1c8;">
                        <tr>
                            <td style="font-family: monospace; font-size: 11px; vertical-align: middle;">
                                <a href="' . htmlspecialchars($cfg['privacy_url']) . '" style="color: #666666; text-decoration: underline; margin-right: 14px;" target="_blank">Privacy Policy</a>
                                <a href="' . htmlspecialchars($cfg['frontend_url']) . '" style="color: #666666; text-decoration: underline;" target="_blank">Visit Atelier</a>
                            </td>
                            <td style="text-align: right; vertical-align: middle;">
                                <a href="' . htmlspecialchars($unsubscribeUrl) . '" style="display: inline-block; background-color: #ffffff; color: #c84b31; border: 1px solid #c84b31; padding: 5px 12px; font-family: monospace; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px;" target="_blank">
                                    Unsubscribe →
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>

            </div>
        </body>
        </html>';
    }

    /**
     * Dispatch welcome confirmation email to a new subscriber.
     */
    public static function sendNewsletterWelcome(\App\Models\NewsletterSubscriber $subscriber): void
    {
        try {
            $cfg = self::configureNewsletterMailer();
            $token = $subscriber->ensureToken();
            $unsubscribeUrl = $cfg['frontend_url'] . '/newsletter/unsubscribe?token=' . urlencode($token);

            $subject = "Welcome to The Winehouse Cellar Dispatches";
            $nameGreeting = !empty($subscriber->name) ? ' ' . htmlspecialchars($subscriber->name) : '';

            $content = '
            <p style="font-size: 15px; margin-top: 0;">Dear' . $nameGreeting . ',</p>
            <p>Thank you for subscribing to <strong>The Winehouse Cellar Dispatches</strong>. You have been added to our private allocations and tastings registry.</p>
            <div style="background-color: #ffffff; border-left: 3px solid #c84b31; border: 1px solid #e0deda; padding: 14px 18px; margin: 18px 0; border-radius: 3px;">
                <div style="font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #c84b31; margin-bottom: 4px;">What You Will Receive</div>
                <ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 13px; color: #444444; line-height: 1.6;">
                    <li>Private seasonal parcel allocations &amp; cellar reserve releases</li>
                    <li>Stories from independent Mediterranean growers &amp; terroir notes</li>
                    <li>Exclusive invitations to intimate sommelier tastings &amp; pairings</li>
                </ul>
            </div>
            <p style="font-size: 13px; color: #555555; line-height: 1.6;">Under EU GDPR guidelines, your subscription is entirely voluntary. You may manage your preferences or withdraw your consent at any time using the direct unsubscribe link below.</p>
            <div style="text-align: center; margin: 24px 0 12px 0;">
                <a href="' . htmlspecialchars($cfg['frontend_url']) . '/shop" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; font-family: monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border-radius: 3px;">
                    Explore The Cellar Vault →
                </a>
            </div>';

            $html = self::buildNewsletterHtml(
                $subject,
                "Welcome to the Cellar Dispatches",
                $content,
                "You have been confirmed for The Winehouse private allocations and tastings dispatches.",
                $unsubscribeUrl,
                $cfg
            );

            Mail::html($html, function ($message) use ($subscriber, $subject, $cfg) {
                $message->to($subscriber->email, $subscriber->name ?: null)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($cfg['reply_to'])
                        ->subject($subject);
            });

            Log::info("Dispatched newsletter welcome email to {$subscriber->email}");
        } catch (\Throwable $e) {
            Log::error("Failed to dispatch newsletter welcome email: " . $e->getMessage(), ['exception' => $e]);
        }
    }

    /**
     * Dispatch newsletter campaign to a single subscriber with personalized tokens.
     */
    public static function sendNewsletterCampaign(
        \App\Models\NewsletterCampaign $campaign,
        \App\Models\NewsletterSubscriber $subscriber,
        ?array $cfg = null
    ): bool {
        try {
            $cfg = $cfg ?? self::getNewsletterConfig();
            self::configureNewsletterMailer($cfg);

            $token = $subscriber->ensureToken();
            $unsubscribeUrl = $cfg['frontend_url'] . '/newsletter/unsubscribe?token=' . urlencode($token);

            $content = $campaign->content;
            $content = str_replace(
                ['{{name}}', '{{email}}', '{{unsubscribe_url}}'],
                [htmlspecialchars($subscriber->name ?: 'Reader'), htmlspecialchars($subscriber->email), htmlspecialchars($unsubscribeUrl)],
                $content
            );

            // Wrap plain text lines in paragraph tags if HTML is not already present
            if (!str_contains($content, '<p>') && !str_contains($content, '<div>')) {
                $content = '<p>' . nl2br($content) . '</p>';
            }

            $html = self::buildNewsletterHtml(
                $campaign->subject,
                $campaign->title,
                $content,
                $campaign->preview_text,
                $unsubscribeUrl,
                $cfg
            );

            Mail::html($html, function ($message) use ($subscriber, $campaign, $cfg) {
                $message->to($subscriber->email, $subscriber->name ?: null)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($cfg['reply_to'])
                        ->subject($campaign->subject);
            });

            return true;
        } catch (\Throwable $e) {
            Log::error("Failed to dispatch newsletter campaign #{$campaign->id} to {$subscriber->email}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send test campaign email to admin preview mailbox.
     */
    public static function sendTestNewsletterCampaign(
        \App\Models\NewsletterCampaign $campaign,
        string $recipientEmail,
        ?array $cfg = null
    ): array {
        try {
            $cfg = $cfg ?? self::getNewsletterConfig();
            self::configureNewsletterMailer($cfg);

            $unsubscribeUrl = $cfg['frontend_url'] . '/newsletter/unsubscribe?token=TEST_TOKEN_PREVIEW';

            $content = $campaign->content;
            $content = str_replace(
                ['{{name}}', '{{email}}', '{{unsubscribe_url}}'],
                ['Cellar Patron (Test)', htmlspecialchars($recipientEmail), htmlspecialchars($unsubscribeUrl)],
                $content
            );

            if (!str_contains($content, '<p>') && !str_contains($content, '<div>')) {
                $content = '<p>' . nl2br($content) . '</p>';
            }

            $subject = "[TEST PREVIEW] " . $campaign->subject;

            $html = self::buildNewsletterHtml(
                $subject,
                $campaign->title,
                $content,
                $campaign->preview_text,
                $unsubscribeUrl,
                $cfg
            );

            Mail::html($html, function ($message) use ($recipientEmail, $subject, $cfg) {
                $message->to($recipientEmail)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($cfg['reply_to'])
                        ->subject($subject);
            });

            return ['success' => true, 'message' => "Test newsletter successfully dispatched to {$recipientEmail}."];
        } catch (\Throwable $e) {
            Log::error("Failed to dispatch test newsletter campaign: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}


