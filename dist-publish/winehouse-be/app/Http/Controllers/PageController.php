<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PageController extends Controller
{
    /** Public: single published page by slug. */
    public function publicShow(string $slug)
    {
        return Page::where('published', true)->where('slug', $slug)->firstOrFail();
    }

    public function index()
    {
        return Page::orderBy('title')->get();
    }

    public function store(Request $request)
    {
        return response()->json(Page::create($this->validated($request)), 201);
    }

    public function show(Page $page)
    {
        return $page;
    }

    public function update(Request $request, Page $page)
    {
        $page->update($this->validated($request, $page));

        return $page->fresh();
    }

    public function destroy(Page $page)
    {
        $page->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?Page $page = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('pages', 'slug')->ignore($page?->id)],
            'body' => ['nullable', 'string'],
            'published' => ['boolean'],
        ]);

        if (empty($data['slug'])) {
            $base = Str::slug($data['title']) ?: 'page';
            $slug = $base;
            $i = 2;
            while (Page::where('slug', $slug)->where('id', '!=', $page?->id)->exists()) {
                $slug = "{$base}-{$i}";
                $i++;
            }
            $data['slug'] = $slug;
        }

        return $data;
    }
}
