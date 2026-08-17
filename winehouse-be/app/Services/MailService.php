<?php

namespace App\Services;

use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Setting;
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

        $username = $mailConfig['mail_username'] ?? env('MAIL_USERNAME', '');
        $password = $mailConfig['mail_password'] ?? env('MAIL_PASSWORD', '');
        $fromAddress = $mailConfig['mail_from_address'] ?? ($siteSettings['contact']['email'] ?? env('MAIL_FROM_ADDRESS', 'info@winehouse.gr'));
        $fromName = $mailConfig['mail_from_name'] ?? ($siteSettings['name'] ?? env('MAIL_FROM_NAME', 'The Winehouse'));
        $companyEmail = $mailConfig['company_notification_email'] ?? ($siteSettings['contact']['email'] ?? 'info@winehouse.gr');

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
                return;
            }

            $recipient = $cfg['company_email'];
            $subject = "[Inquiry] New message from {$contactMessage->name} — " . ($contactMessage->subject ?: 'Website Contact');

            $html = '
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fcfbfa; border: 1.5px solid #111111; color: #111111;">
                <div style="border-bottom: 2px solid #c84b31; padding-bottom: 15px; margin-bottom: 20px;">
                    <span style="background-color: #c84b31; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: bold; padding: 3px 8px; text-transform: uppercase; letter-spacing: 1px;">New Ingestion</span>
                    <h1 style="font-size: 20px; font-weight: 800; margin: 10px 0 0 0; text-transform: uppercase;">' . htmlspecialchars($contactMessage->subject ?: 'Guest Inquiry') . '</h1>
                </div>
                
                <div style="background-color: #ffffff; border: 1px solid #e2ded8; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; color: #777777; width: 80px; font-family: monospace; font-size: 11px; text-transform: uppercase;">From:</td>
                            <td style="padding: 4px 0; font-weight: bold;">' . htmlspecialchars($contactMessage->name) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase;">Email:</td>
                            <td style="padding: 4px 0;"><a href="mailto:' . htmlspecialchars($contactMessage->email) . '" style="color: #c84b31; text-decoration: none; font-weight: bold;">' . htmlspecialchars($contactMessage->email) . '</a></td>
                        </tr>' .
                        ($contactMessage->phone ? '
                        <tr>
                            <td style="padding: 4px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase;">Phone:</td>
                            <td style="padding: 4px 0;">' . htmlspecialchars($contactMessage->phone) . '</td>
                        </tr>' : '') . '
                        <tr>
                            <td style="padding: 4px 0; color: #777777; font-family: monospace; font-size: 11px; text-transform: uppercase;">Date:</td>
                            <td style="padding: 4px 0; font-family: monospace; font-size: 12px;">' . $contactMessage->created_at->format('M d, Y H:i') . '</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-bottom: 25px;">
                    <div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #666666; text-transform: uppercase; margin-bottom: 8px;">Message:</div>
                    <div style="background-color: #ffffff; border-left: 3px solid #c84b31; border: 1px solid #e2ded8; padding: 18px; font-size: 14px; line-height: 1.6; color: #222222; white-space: pre-wrap;">'
                        . nl2br(htmlspecialchars($contactMessage->message)) .
                    '</div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <a href="mailto:' . htmlspecialchars($contactMessage->email) . '?subject=Re: ' . rawurlencode($contactMessage->subject ?: 'The Winehouse Inquiry') . '" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 10px 22px; font-family: monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Reply to Guest →</a>
                </div>
            </div>';

            Mail::html($html, function ($message) use ($recipient, $subject, $cfg, $contactMessage) {
                $message->to($recipient)
                        ->from($cfg['from_address'], $cfg['from_name'])
                        ->replyTo($contactMessage->email, $contactMessage->name)
                        ->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch company contact notification email: ' . $e->getMessage());
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

            $recipient = $cfg['company_email'];
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

            Mail::html($html, function ($message) use ($recipient, $subject, $cfg, $order) {
                $message->to($recipient)
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
