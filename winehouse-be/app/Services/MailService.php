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
}

