<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Folder;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FolderController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type');

        $query = Folder::query();

        if (!empty($type)) {
            $query->where('type', $type);
        }

        $folders = $query->orderBy('name')->get();

        // Calculate reactive items count for each folder
        $folders->transform(function ($folder) {
            $count = match ($folder->type) {
                'asset' => Asset::where('folder_id', $folder->id)->count(),
                'page' => Page::where('folder_id', $folder->id)->count(),
                'post' => Post::where('folder_id', $folder->id)->count(),
                'product' => Product::where('folder_id', $folder->id)->count(),
                default => 0,
            };

            $folder->items_count = $count;
            return $folder;
        });

        return response()->json($folders);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', Rule::in(['asset', 'page', 'post', 'product'])],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if (empty($data['color'])) {
            $data['color'] = 'slate';
        }

        $folder = Folder::create($data);
        $folder->items_count = 0;

        return response()->json($folder, 201);
    }

    public function show(Folder $folder)
    {
        $folder->items_count = match ($folder->type) {
            'asset' => Asset::where('folder_id', $folder->id)->count(),
            'page' => Page::where('folder_id', $folder->id)->count(),
            'post' => Post::where('folder_id', $folder->id)->count(),
            'product' => Product::where('folder_id', $folder->id)->count(),
            default => 0,
        };

        return response()->json($folder);
    }

    public function update(Request $request, Folder $folder)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $folder->update($data);

        $folder->items_count = match ($folder->type) {
            'asset' => Asset::where('folder_id', $folder->id)->count(),
            'page' => Page::where('folder_id', $folder->id)->count(),
            'post' => Post::where('folder_id', $folder->id)->count(),
            'product' => Product::where('folder_id', $folder->id)->count(),
            default => 0,
        };

        return response()->json($folder);
    }

    public function destroy(Folder $folder)
    {
        // Detach items from folder (safe removal - items become unorganized)
        match ($folder->type) {
            'asset' => Asset::where('folder_id', $folder->id)->update(['folder_id' => null]),
            'page' => Page::where('folder_id', $folder->id)->update(['folder_id' => null]),
            'post' => Post::where('folder_id', $folder->id)->update(['folder_id' => null]),
            'product' => Product::where('folder_id', $folder->id)->update(['folder_id' => null]),
            default => null,
        };

        // If folder has subfolders, set their parent_id to this folder's parent
        Folder::where('parent_id', $folder->id)->update(['parent_id' => $folder->parent_id]);

        $folder->delete();

        return response()->json(['ok' => true]);
    }

    public function bulkMove(Request $request)
    {
        $request->validate([
            'type' => ['required', 'string', Rule::in(['asset', 'page', 'post', 'product'])],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        $type = $request->input('type');
        $ids = $request->input('ids');
        $folderId = $request->input('folder_id');

        $count = match ($type) {
            'asset' => Asset::whereIn('id', $ids)->update(['folder_id' => $folderId]),
            'page' => Page::whereIn('id', $ids)->update(['folder_id' => $folderId]),
            'post' => Post::whereIn('id', $ids)->update(['folder_id' => $folderId]),
            'product' => Product::whereIn('id', $ids)->update(['folder_id' => $folderId]),
            default => 0,
        };

        return response()->json([
            'ok' => true,
            'moved_count' => $count,
            'folder_id' => $folderId,
        ]);
    }
}
