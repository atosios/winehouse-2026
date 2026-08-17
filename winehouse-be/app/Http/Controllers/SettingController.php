<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Public endpoint: retrieve site settings.
     */
    public function publicIndex()
    {
        return response()->json(Setting::allSettings());
    }

    /**
     * Admin endpoint: retrieve site settings.
     */
    public function index()
    {
        return response()->json(Setting::allSettings());
    }

    /**
     * Admin endpoint: update site settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'legalName' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'array'],
            'contact.email' => ['nullable', 'string', 'max:255'],
            'contact.phone' => ['nullable', 'string', 'max:255'],
            'contact.address' => ['nullable', 'array'],
            'contact.address.street' => ['nullable', 'string', 'max:255'],
            'contact.address.city' => ['nullable', 'string', 'max:255'],
            'contact.address.postalCode' => ['nullable', 'string', 'max:255'],
            'contact.address.country' => ['nullable', 'string', 'max:255'],
            'contact.mapUrl' => ['nullable', 'string', 'max:500'],
            'hours' => ['nullable', 'array'],
            'hours.*.days' => ['required_with:hours', 'string', 'max:255'],
            'hours.*.time' => ['required_with:hours', 'string', 'max:255'],
            'socials' => ['nullable', 'array'],
            'socials.*.label' => ['required_with:socials', 'string', 'max:255'],
            'socials.*.url' => ['required_with:socials', 'string', 'max:500'],
            'nav' => ['nullable', 'array'],
            'nav.*.label' => ['required_with:nav', 'string', 'max:255'],
            'nav.*.path' => ['required_with:nav', 'string', 'max:255'],
            'colors' => ['nullable', 'array'],
            'colors.primary' => ['nullable', 'string', 'max:50'],
            'colors.paper' => ['nullable', 'string', 'max:50'],
            'colors.ink' => ['nullable', 'string', 'max:50'],
            'colors.accent' => ['nullable', 'string', 'max:50'],
            'colors.terracotta' => ['nullable', 'string', 'max:50'],
            'colors.card_dark' => ['nullable', 'string', 'max:50'],
            'homepage_content' => ['nullable', 'array'],
            'about_content' => ['nullable', 'array'],
            'shop_content' => ['nullable', 'array'],
            'contact_content' => ['nullable', 'array'],
            'maintenance_content' => ['nullable', 'array'],
            'maintenance_mode' => ['nullable', 'boolean'],
            'store_config' => ['nullable', 'array'],
            'mail_config' => ['nullable', 'array'],
            'mail_config.mail_driver' => ['nullable', 'string', 'max:50'],
            'mail_config.mail_host' => ['nullable', 'string', 'max:255'],
            'mail_config.mail_port' => ['nullable', 'integer'],
            'mail_config.mail_encryption' => ['nullable', 'string', 'max:20'],
            'mail_config.mail_username' => ['nullable', 'string', 'max:255'],
            'mail_config.mail_password' => ['nullable', 'string', 'max:255'],
            'mail_config.mail_from_address' => ['nullable', 'string', 'max:255'],
            'mail_config.mail_from_name' => ['nullable', 'string', 'max:255'],
            'mail_config.company_notification_email' => ['nullable', 'string', 'max:255'],
            'mail_config.notify_on_new_order' => ['nullable', 'boolean'],
            'mail_config.notify_on_new_message' => ['nullable', 'boolean'],
            'mail_config.send_customer_order_confirmation' => ['nullable', 'boolean'],
        ]);

        $updated = Setting::updateSettings($validated);

        return response()->json($updated);
    }

    /**
     * Admin endpoint: send test email using configured or provided SMTP parameters.
     */
    public function sendTestEmail(Request $request)
    {
        $validated = $request->validate([
            'recipient_email' => ['required', 'email'],
            'mail_config' => ['nullable', 'array'],
        ]);

        $result = \App\Services\MailService::sendTestEmail(
            $validated['recipient_email'],
            $validated['mail_config'] ?? null
        );

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }
}
