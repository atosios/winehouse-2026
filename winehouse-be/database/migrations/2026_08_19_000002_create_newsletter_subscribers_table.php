<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name')->nullable();
            $table->string('status')->default('subscribed')->index(); // 'subscribed', 'unsubscribed'
            $table->string('source')->default('homepage'); // 'homepage', 'contact_form', 'admin_manual', 'checkout'
            $table->timestamp('consent_given_at')->nullable();
            $table->text('consent_text')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('token', 64)->unique()->nullable();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
