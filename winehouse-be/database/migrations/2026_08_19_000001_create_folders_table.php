<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 50)->index(); // 'asset', 'page', 'post', 'product'
            $table->foreignId('parent_id')->nullable()->constrained('folders')->onDelete('cascade');
            $table->string('color', 50)->nullable()->default('slate');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('mime_type')->constrained('folders')->nullOnDelete();
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('slug')->constrained('folders')->nullOnDelete();
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('post_type')->constrained('folders')->nullOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('category')->constrained('folders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::dropIfExists('folders');
    }
};
