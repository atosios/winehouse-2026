<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    /** Public: published posts only. */
    public function publicIndex()
    {
        return Post::where('published', true)
            ->orderByDesc('published_at')
            ->get([
                'id',
                'title',
                'slug',
                'post_type',
                'category',
                'tags',
                'author_name',
                'layout_style',
                'mood_color',
                'meta_data',
                'excerpt',
                'cover_image',
                'published_at',
            ]);
    }

    /** Public: single published post by slug. */
    public function publicShow(string $slug)
    {
        return Post::where('published', true)->where('slug', $slug)->firstOrFail();
    }

    public function index(Request $request)
    {
        $query = Post::with('folder')->orderByDesc('created_at');

        if ($request->has('folder_id')) {
            $folderId = $request->query('folder_id');
            if ($folderId === 'null' || $folderId === 'root' || $folderId === '') {
                $query->whereNull('folder_id');
            } elseif (is_numeric($folderId)) {
                $query->where('folder_id', (int) $folderId);
            }
        }

        return $query->get();
    }

    public function categories()
    {
        $defaultCategories = [
            'Tasting Notes',
            'Cellar Stories',
            'Vintage Reports',
            'Producer Spotlight',
            'Pairing Guide',
            'Events & Tastings',
        ];

        $stored = Setting::get('article_categories', $defaultCategories);
        if (!is_array($stored)) {
            $stored = $defaultCategories;
        }

        $postCategories = Post::whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category')
            ->values()
            ->all();

        $allCategories = array_values(array_unique(array_filter(array_merge($stored, $postCategories))));
        return response()->json($allCategories);
    }

    public function storeCategory(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $name = trim($request->input('name'));
        if (empty($name)) {
            return response()->json(['message' => 'Category name cannot be empty'], 422);
        }

        $defaultCategories = [
            'Tasting Notes',
            'Cellar Stories',
            'Vintage Reports',
            'Producer Spotlight',
            'Pairing Guide',
            'Events & Tastings',
        ];
        $stored = Setting::get('article_categories', $defaultCategories);
        if (!is_array($stored)) {
            $stored = $defaultCategories;
        }

        if (!in_array($name, $stored, true)) {
            $stored[] = $name;
            Setting::set('article_categories', array_values(array_unique($stored)));
        }

        return $this->categories();
    }

    public function destroyCategory(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string'],
        ]);

        $name = trim($request->input('name'));

        // 1. Remove category from all posts (they 'lose' this category)
        $affected = Post::where('category', $name)->update(['category' => null]);

        // 2. Remove from stored settings categories
        $defaultCategories = [
            'Tasting Notes',
            'Cellar Stories',
            'Vintage Reports',
            'Producer Spotlight',
            'Pairing Guide',
            'Events & Tastings',
        ];
        $stored = Setting::get('article_categories', $defaultCategories);
        if (!is_array($stored)) {
            $stored = $defaultCategories;
        }

        $updatedCategories = array_values(array_filter($stored, function ($item) use ($name) {
            return strcasecmp($item, $name) !== 0;
        }));

        Setting::set('article_categories', $updatedCategories);

        return response()->json([
            'success' => true,
            'categories' => $updatedCategories,
            'affected_posts' => $affected,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $post = Post::create($data);

        return response()->json($post->load('folder'), 201);
    }

    public function show(Post $post)
    {
        return $post->load('folder');
    }

    public function update(Request $request, Post $post)
    {
        $post->update($this->validated($request, $post));

        return $post->fresh(['folder']);
    }

    public function destroy(Post $post)
    {
        $post->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?Post $post = null): array
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('posts', 'slug')->ignore($post?->id)],
            'post_type' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'string', 'max:100'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'author_name' => ['nullable', 'string', 'max:150'],
            'layout_style' => ['nullable', 'string', 'max:50'],
            'mood_color' => ['nullable', 'string', 'max:50'],
            'meta_data' => ['nullable', 'array'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'published' => ['boolean'],
            'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        if (empty($data['title'])) {
            $data['title'] = 'Untitled';
        }

        if (empty($data['slug'])) {
            $base = Str::slug($data['title'] ?: 'post') ?: 'post';
            $slug = $base;
            $i = 2;
            while (Post::where('slug', $slug)->where('id', '!=', $post?->id)->exists()) {
                $slug = "{$base}-{$i}";
                $i++;
            }
            $data['slug'] = $slug;
        }

        $wasPublished = $post?->published ?? false;
        if (($data['published'] ?? false) && ! $wasPublished) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
