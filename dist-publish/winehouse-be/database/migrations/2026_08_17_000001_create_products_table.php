<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('vintage', 50)->nullable();
            $table->json('region')->nullable(); // { en: '...', el: '...' }
            $table->json('varietal')->nullable(); // { en: '...', el: '...' }
            $table->string('category', 50)->default('ALL'); // VOLCANIC, NATURAL, RESERVE, INDIGENOUS, etc.
            $table->decimal('price', 10, 2)->default(0.00);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->integer('stock_quantity')->default(50);
            $table->boolean('is_allocated')->default(false);
            $table->json('status_label')->nullable(); // e.g. { en: 'LIMITED 120 BOTTLES', el: 'ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ' }
            $table->string('status_bg', 50)->default('bg-[#922e1b]');
            $table->json('soil')->nullable(); // e.g. { en: 'Limestone & Clay Slopes', el: 'Ασβεστολιθικές Πλαγιές' }
            $table->string('alcohol', 50)->default('13.5%');
            $table->json('tasting_note')->nullable(); // { en: '...', el: '...' }
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->boolean('published')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
