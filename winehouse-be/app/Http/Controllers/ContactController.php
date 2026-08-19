<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * Public endpoint to submit contact / inquiry form.
     */
    public function publicStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'subject' => ['nullable', 'string', 'max:255'],
            'project_type' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
            'subscribe_newsletter' => ['nullable', 'boolean'],
        ]);

        $subject = $validated['subject'] ?? ($validated['project_type'] ?? 'General Inquiry');

        $contactMessage = ContactMessage::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $subject,
            'project_type' => $validated['project_type'] ?? $subject,
            'message' => $validated['message'],
            'is_read' => false,
            'status' => 'new',
            'ip_address' => $request->ip(),
        ]);

        // If user opted-in to newsletter subscription
        if (!empty($validated['subscribe_newsletter'])) {
            $email = strtolower(trim($validated['email']));
            $existingSub = \App\Models\NewsletterSubscriber::where('email', $email)->first();
            if (!$existingSub) {
                $newSub = \App\Models\NewsletterSubscriber::create([
                    'email' => $email,
                    'name' => trim($validated['name']),
                    'status' => 'subscribed',
                    'source' => 'contact_form',
                    'consent_given_at' => now(),
                    'consent_text' => 'Opted in to cellar newsletter dispatches via contact inquiry form.',
                    'ip_address' => $request->ip(),
                    'token' => \App\Models\NewsletterSubscriber::generateUniqueToken(),
                ]);
                MailService::sendNewsletterWelcome($newSub);
            } elseif ($existingSub->status === 'unsubscribed') {
                $existingSub->update([
                    'status' => 'subscribed',
                    'source' => 'contact_form',
                    'consent_given_at' => now(),
                    'consent_text' => 'Re-subscribed to cellar newsletter dispatches via contact inquiry form.',
                    'ip_address' => $request->ip(),
                    'unsubscribed_at' => null,
                ]);
                $existingSub->ensureToken();
                MailService::sendNewsletterWelcome($existingSub);
            }
        }

        // Trigger company email notification
        MailService::notifyCompanyNewContact($contactMessage);

        return response()->json([
            'success' => true,
            'message' => 'Thank you. Your message has been received by our cellar master.',
            'id' => $contactMessage->id,
        ], 201);
    }

    /**
     * Admin listing of all contact inquiries with filters & unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ContactMessage::orderBy('id', 'desc');

        if ($filter = $request->query('status')) {
            if ($filter === 'unread') {
                $query->where('is_read', false);
            } elseif ($filter === 'read') {
                $query->where('is_read', true);
            } elseif ($filter === 'archived') {
                $query->where('status', 'archived');
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $messages = $query->get();
        $unreadCount = ContactMessage::where('is_read', false)->count();

        return response()->json([
            'messages' => $messages,
            'unread_count' => $unreadCount,
            'total_count' => ContactMessage::count(),
        ]);
    }

    /**
     * Admin view single message details & automatically mark as read.
     */
    public function show(ContactMessage $message): JsonResponse
    {
        if (!$message->is_read) {
            $message->update([
                'is_read' => true,
                'status' => $message->status === 'new' ? 'read' : $message->status,
            ]);
        }

        return response()->json($message);
    }

    /**
     * Admin toggle read status or update category status.
     */
    public function updateStatus(Request $request, ContactMessage $message): JsonResponse
    {
        $validated = $request->validate([
            'is_read' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'in:new,read,archived,replied'],
        ]);

        $updates = [];
        if (isset($validated['is_read'])) {
            $updates['is_read'] = (bool) $validated['is_read'];
            if ($updates['is_read'] && $message->status === 'new') {
                $updates['status'] = 'read';
            }
        }
        if (!empty($validated['status'])) {
            $updates['status'] = $validated['status'];
            if ($validated['status'] === 'read') {
                $updates['is_read'] = true;
            }
        }

        if (!empty($updates)) {
            $message->update($updates);
        }

        return response()->json($message);
    }

    /**
     * Admin delete contact message.
     */
    public function destroy(ContactMessage $message): JsonResponse
    {
        $message->delete();

        return response()->json(['success' => true]);
    }
}
