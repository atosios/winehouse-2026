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
                'max:10240', // 10 MB
                'mimes:jpg,jpeg,png,webp,gif,svg,pdf',
            ],
        ]);

        $file = $request->file('file');
        $path = $file->store('uploads', 'public');

        $asset = Asset::create([
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
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
}
