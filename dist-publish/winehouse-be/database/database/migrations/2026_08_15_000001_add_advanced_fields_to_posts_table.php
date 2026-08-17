<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('post_type', 50)->default('story')->after('slug');
            $table->string('category', 100)->nullable()->after('post_type');
            $table->json('tags')->nullable()->after('category');
            $table->string('author_name', 150)->nullable()->after('tags');
            $table->string('layout_style', 50)->default('editorial')->after('author_name');
            $table->string('mood_color', 50)->default('wine')->after('layout_style');
            $table->json('meta_data')->nullable()->after('mood_color');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn([
                'post_type',
                'category',
                'tags',
                'author_name',
                'layout_style',
                'mood_color',
                'meta_data',
            ]);
        });
    }
};
