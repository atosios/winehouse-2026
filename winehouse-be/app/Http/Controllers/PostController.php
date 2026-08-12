<?php

namespace App\Http\Controllers;

use App\Models\Post;
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
            ->get(['id', 'title', 'slug', 'excerpt', 'cover_image', 'published_at']);
    }

    /** Public: single published post by slug. */
    public function publicShow(string $slug)
    {
        return Post::where('published', true)->where('slug', $slug)->firstOrFail();
    }

    public function index()
    {
        return Post::orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        return response()->json(Post::create($data), 201);
    }

    public function show(Post $post)
    {
        return $post;
    }

    public function update(Request $request, Post $post)
    {
        $post->update($this->validated($request, $post));

        return $post->fresh();
    }

    public function destroy(Post $post)
    {
        $post->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?Post $post = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('posts', 'slug')->ignore($post?->id)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:255'],
            'published' => ['boolean'],
        ]);

        if (empty($data['slug'])) {
            $base = Str::slug($data['title']) ?: 'post';
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
