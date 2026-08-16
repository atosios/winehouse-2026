<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public content endpoints (for the website).
Route::get('/settings', [SettingController::class, 'publicIndex']);
Route::get('/posts', [PostController::class, 'publicIndex']);
Route::get('/posts/{slug}', [PostController::class, 'publicShow']);
Route::get('/pages/{slug}', [PageController::class, 'publicShow']);

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
    Route::apiResource('posts', PostController::class);
    Route::apiResource('pages', PageController::class);
    Route::apiResource('users', UserController::class);

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    Route::get('/assets', [AssetController::class, 'index']);
    Route::post('/assets', [AssetController::class, 'store']);
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy']);
});
