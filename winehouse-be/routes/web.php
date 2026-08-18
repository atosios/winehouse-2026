<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return response()->json([
        'app' => config('app.name'),
        'status' => 'ok',
    ]);
});

Route::get('/sitemap.xml', [\App\Http\Controllers\SitemapController::class, 'index']);
Route::get('/llms.txt', [\App\Http\Controllers\LlmsTxtController::class, 'index']);
Route::get('/llms-full.txt', [\App\Http\Controllers\LlmsTxtController::class, 'full']);

/**
 * Direct storage media file server.
 * Ensures media files (images, videos, documents) work seamlessly on shared hosting (StackCP/cPanel)
 * even if symbolic links are disabled, broken, or missing.
 * Uses BinaryFileResponse which provides HTTP 206 Byte-Range streaming (required for iOS/Safari/Chrome video playback).
 */
Route::match(['GET', 'HEAD', 'OPTIONS'], '/storage/{path}', function (string $path) {
    if (request()->isMethod('OPTIONS')) {
        return response('', 204, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
        ]);
    }

    // Sanitize path against directory traversal
    $cleanPath = str_replace(['..', "\0"], '', $path);
    $cleanPath = ltrim($cleanPath, '/');

    if (!Storage::disk('public')->exists($cleanPath)) {
        abort(404, 'Media file not found');
    }

    $filePath = Storage::disk('public')->path($cleanPath);
    $mimeType = Storage::disk('public')->mimeType($cleanPath) ?: 'application/octet-stream';

    return response()->file($filePath, [
        'Content-Type' => $mimeType,
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => '*',
        'Cache-Control' => 'public, max-age=31536000, immutable',
    ]);
})->where('path', '.*');

