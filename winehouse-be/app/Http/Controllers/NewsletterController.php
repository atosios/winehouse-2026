<?php

namespace App\Http\Controllers;

use App\Models\NewsletterCampaign;
use App\Models\NewsletterSubscriber;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NewsletterController extends Controller
{
    /**
     * Public endpoint: Subscribe to newsletter with GDPR explicit consent.
     */
    public function publicSubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'consent' => ['required', 'boolean', 'accepted'],
            'source' => ['nullable', 'string', 'max:100'],
            'consent_text' => ['nullable', 'string', 'max:1000'],
        ]);

        $email = strtolower(trim($validated['email']));
        $name = !empty($validated['name']) ? trim($validated['name']) : null;
        $source = $validated['source'] ?? 'homepage';
        $consentText = $validated['consent_text'] ?? 'I consent to receive newsletter and marketing dispatches from The Winehouse Atelier under EU GDPR regulations.';
        $ip = $request->ip();

        $subscriber = NewsletterSubscriber::where('email', $email)->first();

        if ($subscriber) {
            if ($subscriber->status === 'subscribed') {
                return response()->json([
                    'success' => true,
                    'message' => 'You are already registered for The Winehouse Cellar Dispatches.',
                    'subscriber' => [
                        'email' => $subscriber->email,
                        'status' => $subscriber->status,
                    ],
                ]);
            }

            // Resubscribe with fresh consent log
            $subscriber->update([
                'name' => $name ?? $subscriber->name,
                'status' => 'subscribed',
                'source' => $source,
                'consent_given_at' => now(),
                'consent_text' => $consentText,
                'ip_address' => $ip,
                'unsubscribed_at' => null,
            ]);
            $subscriber->ensureToken();

            MailService::sendNewsletterWelcome($subscriber);

            return response()->json([
                'success' => true,
                'message' => 'Welcome back! Your subscription to The Winehouse Cellar Dispatches has been reactivated.',
                'subscriber' => [
                    'email' => $subscriber->email,
                    'status' => $subscriber->status,
                ],
            ]);
        }

        $subscriber = NewsletterSubscriber::create([
            'email' => $email,
            'name' => $name,
            'status' => 'subscribed',
            'source' => $source,
            'consent_given_at' => now(),
            'consent_text' => $consentText,
            'ip_address' => $ip,
            'token' => NewsletterSubscriber::generateUniqueToken(),
        ]);

        MailService::sendNewsletterWelcome($subscriber);

        return response()->json([
            'success' => true,
            'message' => 'Thank you for subscribing to The Winehouse Cellar Dispatches.',
            'subscriber' => [
                'email' => $subscriber->email,
                'status' => $subscriber->status,
            ],
        ], 201);
    }

    /**
     * Public endpoint: 1-click tokenized or email-based unsubscription.
     */
    public function publicUnsubscribe(Request $request): JsonResponse
    {
        $token = $request->input('token') ?? $request->query('token');
        $email = $request->input('email') ?? $request->query('email');

        if (empty($token) && empty($email)) {
            return response()->json([
                'success' => false,
                'message' => 'An unsubscribe token or email address is required.',
            ], 422);
        }

        $query = NewsletterSubscriber::query();
        if (!empty($token)) {
            $query->where('token', trim($token));
        } else {
            $query->where('email', strtolower(trim($email)));
        }

        $subscriber = $query->first();

        if (!$subscriber) {
            return response()->json([
                'success' => false,
                'message' => 'We could not find an active subscription matching your link or address.',
            ], 404);
        }

        if ($subscriber->status !== 'unsubscribed') {
            $subscriber->update([
                'status' => 'unsubscribed',
                'unsubscribed_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'You have been successfully unsubscribed from all Winehouse cellar dispatches.',
            'email' => $subscriber->email,
        ]);
    }

    /**
     * Admin: List subscribers with search, status filters and metrics.
     */
    public function adminSubscribers(Request $request): JsonResponse
    {
        $query = NewsletterSubscriber::orderBy('id', 'desc');

        if ($status = $request->query('status')) {
            if ($status === 'subscribed' || $status === 'unsubscribed') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('source', 'like', "%{$search}%");
            });
        }

        $subscribers = $query->get();

        $totalCount = NewsletterSubscriber::count();
        $activeCount = NewsletterSubscriber::where('status', 'subscribed')->count();
        $unsubCount = NewsletterSubscriber::where('status', 'unsubscribed')->count();
        $recentCount = NewsletterSubscriber::where('created_at', '>=', now()->subDays(30))->count();

        return response()->json([
            'subscribers' => $subscribers,
            'stats' => [
                'total' => $totalCount,
                'active' => $activeCount,
                'unsubscribed' => $unsubCount,
                'recent_30d' => $recentCount,
            ],
        ]);
    }

    /**
     * Admin: Add subscriber manually.
     */
    public function adminStoreSubscriber(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:newsletter_subscribers,email'],
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:subscribed,unsubscribed'],
            'source' => ['nullable', 'string', 'max:100'],
        ]);

        $subscriber = NewsletterSubscriber::create([
            'email' => strtolower(trim($validated['email'])),
            'name' => $validated['name'] ?? null,
            'status' => $validated['status'] ?? 'subscribed',
            'source' => $validated['source'] ?? 'admin_manual',
            'consent_given_at' => now(),
            'consent_text' => 'Subscribed manually via Admin Atelier Console.',
            'ip_address' => $request->ip(),
            'token' => NewsletterSubscriber::generateUniqueToken(),
        ]);

        return response()->json($subscriber, 201);
    }

    /**
     * Admin: Update subscriber attributes or toggle status.
     */
    public function adminUpdateSubscriber(Request $request, NewsletterSubscriber $subscriber): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:subscribed,unsubscribed'],
            'email' => ['nullable', 'email', 'max:255', "unique:newsletter_subscribers,email,{$subscriber->id}"],
        ]);

        $updates = [];
        if (isset($validated['name'])) {
            $updates['name'] = $validated['name'];
        }
        if (!empty($validated['email'])) {
            $updates['email'] = strtolower(trim($validated['email']));
        }
        if (!empty($validated['status'])) {
            $updates['status'] = $validated['status'];
            if ($validated['status'] === 'unsubscribed' && empty($subscriber->unsubscribed_at)) {
                $updates['unsubscribed_at'] = now();
            } elseif ($validated['status'] === 'subscribed') {
                $updates['unsubscribed_at'] = null;
            }
        }

        $subscriber->update($updates);

        return response()->json($subscriber);
    }

    /**
     * Admin: Delete subscriber record (GDPR right to erasure).
     */
    public function adminDeleteSubscriber(NewsletterSubscriber $subscriber): JsonResponse
    {
        $subscriber->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Admin: Export all subscribers as CSV.
     */
    public function adminExportSubscribers(Request $request): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="winehouse-subscribers-' . date('Y-m-d') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'ID',
                'Email',
                'Name',
                'Status',
                'Source',
                'Consent Date',
                'Consent Text',
                'IP Address',
                'Created At',
            ]);

            NewsletterSubscriber::orderBy('id', 'asc')->chunk(200, function ($subscribers) use ($handle) {
                foreach ($subscribers as $sub) {
                    fputcsv($handle, [
                        $sub->id,
                        $sub->email,
                        $sub->name ?: '',
                        $sub->status,
                        $sub->source,
                        $sub->consent_given_at ? $sub->consent_given_at->toIso8601String() : '',
                        $sub->consent_text ?: '',
                        $sub->ip_address ?: '',
                        $sub->created_at ? $sub->created_at->toIso8601String() : '',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Admin: List newsletter campaigns.
     */
    public function adminCampaigns(): JsonResponse
    {
        $campaigns = NewsletterCampaign::orderBy('id', 'desc')->get();

        return response()->json($campaigns);
    }

    /**
     * Admin: Create draft newsletter campaign.
     */
    public function adminStoreCampaign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        $campaign = NewsletterCampaign::create([
            'subject' => $validated['subject'],
            'title' => $validated['title'] ?? null,
            'preview_text' => $validated['preview_text'] ?? null,
            'content' => $validated['content'],
            'status' => 'draft',
        ]);

        return response()->json($campaign, 201);
    }

    /**
     * Admin: Show campaign.
     */
    public function adminShowCampaign(NewsletterCampaign $campaign): JsonResponse
    {
        return response()->json($campaign);
    }

    /**
     * Admin: Update draft campaign.
     */
    public function adminUpdateCampaign(Request $request, NewsletterCampaign $campaign): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:draft,sent'],
        ]);

        $campaign->update(array_filter($validated, fn($val) => $val !== null));

        return response()->json($campaign);
    }

    /**
     * Admin: Delete campaign.
     */
    public function adminDeleteCampaign(NewsletterCampaign $campaign): JsonResponse
    {
        $campaign->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Admin: Send test email of campaign to recipient.
     */
    public function adminSendTestCampaign(Request $request, NewsletterCampaign $campaign): JsonResponse
    {
        $validated = $request->validate([
            'recipient_email' => ['required', 'email'],
        ]);

        $cfg = MailService::configureNewsletterMailer();
        $result = MailService::sendTestNewsletterCampaign($campaign, $validated['recipient_email'], $cfg);

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }

    /**
     * Admin: Broadcast campaign to all active subscribers.
     */
    public function adminSendCampaign(NewsletterCampaign $campaign): JsonResponse
    {
        $subscribers = NewsletterSubscriber::subscribed()->get();

        if ($subscribers->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'There are currently no active subscribers in the registry to receive this campaign.',
            ], 422);
        }

        $cfg = MailService::configureNewsletterMailer();
        $sentCount = 0;

        foreach ($subscribers as $subscriber) {
            $dispatched = MailService::sendNewsletterCampaign($campaign, $subscriber, $cfg);
            if ($dispatched) {
                $sentCount++;
            }
        }

        $campaign->update([
            'status' => 'sent',
            'sent_count' => $sentCount,
            'recipient_count' => $subscribers->count(),
            'sent_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Campaign successfully broadcast to {$sentCount} active subscribers.",
            'campaign' => $campaign,
        ]);
    }
}
