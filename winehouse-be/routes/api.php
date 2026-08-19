<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\LlmsTxtController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public content & e-Shop endpoints.
Route::get('/sitemap.xml', [SitemapController::class, 'index']);
Route::get('/llms.txt', [LlmsTxtController::class, 'index']);
Route::get('/llms-full.txt', [LlmsTxtController::class, 'full']);
Route::get('/settings', [SettingController::class, 'publicIndex']);
Route::get('/posts', [PostController::class, 'publicIndex']);
Route::get('/posts/{slug}', [PostController::class, 'publicShow']);
Route::get('/pages/{slug}', [PageController::class, 'publicShow']);
Route::post('/contact', [ContactController::class, 'publicStore']);

// Public e-Shop endpoints.
Route::get('/shop/products', [ProductController::class, 'publicIndex']);
Route::get('/shop/products/{slugOrId}', [ProductController::class, 'publicShow']);
Route::post('/shop/orders', [OrderController::class, 'publicStore']);

// Admin auth.
Route::post('/admin/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Admin panel (token required).
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/password', [AuthController::class, 'updatePassword']);

    Route::get('/categories', [PostController::class, 'categories']);
    Route::post('/categories', [PostController::class, 'storeCategory']);
    Route::delete('/categories', [PostController::class, 'destroyCategory']);

    Route::post('/folders/bulk-move', [FolderController::class, 'bulkMove']);
    Route::apiResource('folders', FolderController::class);

    Route::apiResource('posts', PostController::class);
    Route::apiResource('pages', PageController::class);
    Route::apiResource('users', UserController::class);

    // Products & Orders
    Route::get('/products/template-csv', [ProductController::class, 'downloadTemplateCsv']);
    Route::post('/products/import-csv', [ProductController::class, 'importCsv']);
    Route::apiResource('products', ProductController::class);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Inquiries & Contact Messages
    Route::get('/messages', [ContactController::class, 'index']);
    Route::get('/messages/{message}', [ContactController::class, 'show']);
    Route::put('/messages/{message}/status', [ContactController::class, 'updateStatus']);
    Route::delete('/messages/{message}', [ContactController::class, 'destroy']);

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::post('/settings/mail-test', [SettingController::class, 'sendTestEmail']);

    Route::get('/assets', [AssetController::class, 'index']);
    Route::post('/assets', [AssetController::class, 'store']);
    Route::put('/assets/{asset}', [AssetController::class, 'update']);
    Route::post('/assets/bulk-delete', [AssetController::class, 'bulkDestroy']);
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy']);
});

// Fallback storage media route if requested through /api/storage/...
Route::match(['GET', 'HEAD', 'OPTIONS'], '/storage/{path}', function (string $path) {
    if (request()->isMethod('OPTIONS')) {
        return response('', 204, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
        ]);
    }

    $cleanPath = str_replace(['..', "\0"], '', $path);
    $cleanPath = ltrim($cleanPath, '/');

    if (!\Illuminate\Support\Facades\Storage::disk('public')->exists($cleanPath)) {
        abort(404, 'Media file not found');
    }

    $filePath = \Illuminate\Support\Facades\Storage::disk('public')->path($cleanPath);
    $mimeType = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($cleanPath) ?: 'application/octet-stream';

    return response()->file($filePath, [
        'Content-Type' => $mimeType,
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => '*',
        'Cache-Control' => 'public, max-age=31536000, immutable',
    ]);
})->where('path', '.*');

