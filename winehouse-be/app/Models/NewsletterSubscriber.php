<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NewsletterSubscriber extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'name',
        'status',
        'source',
        'consent_given_at',
        'consent_text',
        'ip_address',
        'token',
        'unsubscribed_at',
    ];

    protected $casts = [
        'consent_given_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    /**
     * Auto-generate secure token on creation/saving if missing.
     */
    protected static function booted()
    {
        static::saving(function (NewsletterSubscriber $subscriber) {
            if (empty($subscriber->token)) {
                $subscriber->token = self::generateUniqueToken();
            }
        });
    }

    /**
     * Scope query to only active subscribed members.
     */
    public function scopeSubscribed($query)
    {
        return $query->where('status', 'subscribed');
    }

    /**
     * Generate a secure unique token for unsubscribe and verification actions.
     */
    public static function generateUniqueToken(): string
    {
        do {
            $token = Str::random(48);
        } while (self::where('token', $token)->exists());

        return $token;
    }

    /**
     * Ensure subscriber has a valid token.
     */
    public function ensureToken(): string
    {
        if (empty($this->token)) {
            $this->token = self::generateUniqueToken();
            $this->save();
        }

        return $this->token;
    }
}
