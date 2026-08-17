<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AssetController extends Controller
{
    public function index()
    {
        return Asset::orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:65536', // 64 MB for images & videos
                'mimes:jpg,jpeg,png,webp,gif,svg,pdf,mp4,webm,mov,ogg,m4v,avif,heic,heif',
            ],
        ]);

        $file = $request->file('file');

        // Ensure storage directory exists with proper permissions
        $destinationDir = storage_path('app/public/uploads');
        if (!is_dir($destinationDir)) {
            @mkdir($destinationDir, 0775, true);
        }

        $path = $file->store('uploads', 'public');

        if (!$path || !Storage::disk('public')->exists($path)) {
            \Illuminate\Support\Facades\Log::error('Asset upload failed to write to disk', [
                'destinationDir' => $destinationDir,
                'is_writable' => is_writable(storage_path('app/public')),
                'original_name' => $file->getClientOriginalName(),
            ]);

            return response()->json([
                'message' => 'Failed to save uploaded file to storage disk. Check folder permissions (chmod -R 775 storage).',
            ], 500);
        }

        $asset = Asset::create([
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType() ?: $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($asset, 201);
    }

    public function destroy(Asset $asset)
    {
        Storage::disk('public')->delete($asset->path);
        $asset->delete();
        return response()->json(['ok' => true]);
    }

    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        $ids = $request->input('ids');
        $assets = Asset::whereIn('id', $ids)->get();
        $count = 0;

        foreach ($assets as $asset) {
            Storage::disk('public')->delete($asset->path);
            $asset->delete();
            $count++;
        }

        return response()->json(['ok' => true, 'deleted_count' => $count]);
    }
}
