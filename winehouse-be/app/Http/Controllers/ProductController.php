<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Public listing for e-Shop.
     */
    public function publicIndex(Request $request): JsonResponse
    {
        $query = Product::where('published', true)->orderBy('sort_order')->orderBy('id', 'desc');

        if ($category = $request->query('category')) {
            if (strtoupper($category) !== 'ALL') {
                $query->where('category', $category);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('vintage', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    /**
     * Public show single bottle.
     */
    public function publicShow(string $slugOrId): JsonResponse
    {
        $product = Product::where('published', true)
            ->where(function ($q) use ($slugOrId) {
                $q->where('slug', $slugOrId)
                  ->orWhere('id', $slugOrId);
            })->firstOrFail();

        return response()->json($product);
    }

    /**
     * Admin listing with pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::orderBy('sort_order')->orderBy('id', 'desc');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('vintage', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            if ($category !== 'ALL') {
                $query->where('category', $category);
            }
        }

        return response()->json($query->get());
    }

    /**
     * Admin store new product.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'vintage' => ['nullable', 'string', 'max:50'],
            'region' => ['nullable'],
            'varietal' => ['nullable'],
            'category' => ['nullable', 'string', 'max:50'],
            'price' => ['required', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'is_allocated' => ['nullable', 'boolean'],
            'status_label' => ['nullable'],
            'status_bg' => ['nullable', 'string', 'max:50'],
            'soil' => ['nullable'],
            'alcohol' => ['nullable', 'string', 'max:50'],
            'tasting_note' => ['nullable'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'gallery' => ['nullable', 'array'],
            'published' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if (empty($validated['slug'])) {
            $base = Str::slug($validated['name'] . (!empty($validated['vintage']) ? '-' . $validated['vintage'] : ''));
            if (empty($base)) {
                $base = 'bottle-' . time();
            }
            $slug = $base;
            $counter = 1;
            while (Product::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (empty($validated['category'])) {
            $validated['category'] = 'VOLCANIC';
        }

        if (empty($validated['status_bg'])) {
            $validated['status_bg'] = 'bg-[#922e1b]';
        }

        if (isset($validated['price'])) {
            $validated['price'] = (float) $validated['price'];
        }

        if (isset($validated['stock_quantity'])) {
            $validated['stock_quantity'] = (int) $validated['stock_quantity'];
        } else {
            $validated['stock_quantity'] = 50;
        }

        if (!isset($validated['published'])) {
            $validated['published'] = true;
        }

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    /**
     * Admin show single product.
     */
    public function show(Product $product): JsonResponse
    {
        return response()->json($product);
    }

    /**
     * Admin update product.
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug,' . $product->id],
            'vintage' => ['nullable', 'string', 'max:50'],
            'region' => ['nullable'],
            'varietal' => ['nullable'],
            'category' => ['nullable', 'string', 'max:50'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'is_allocated' => ['nullable', 'boolean'],
            'status_label' => ['nullable'],
            'status_bg' => ['nullable', 'string', 'max:50'],
            'soil' => ['nullable'],
            'alcohol' => ['nullable', 'string', 'max:50'],
            'tasting_note' => ['nullable'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'gallery' => ['nullable', 'array'],
            'published' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if (empty($validated['slug']) && !empty($validated['name'])) {
            $base = Str::slug($validated['name'] . (!empty($validated['vintage']) ? '-' . $validated['vintage'] : ''));
            if (empty($base)) {
                $base = 'bottle-' . time();
            }
            $slug = $base;
            $counter = 1;
            while (Product::where('slug', $slug)->where('id', '!=', $product->id)->exists()) {
                $slug = $base . '-' . $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (isset($validated['price'])) {
            $validated['price'] = (float) $validated['price'];
        }

        if (isset($validated['stock_quantity'])) {
            $validated['stock_quantity'] = (int) $validated['stock_quantity'];
        }

        $product->update($validated);

        return response()->json($product);
    }

    /**
     * Admin destroy product.
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['success' => true]);
    }
}
