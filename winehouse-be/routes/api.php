<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

// Public content endpoints (for the website).
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

    Route::apiResource('posts', PostController::class);
    Route::apiResource('pages', PageController::class);

    Route::get('/assets', [AssetController::class, 'index']);
    Route::post('/assets', [AssetController::class, 'store']);
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy']);
});
