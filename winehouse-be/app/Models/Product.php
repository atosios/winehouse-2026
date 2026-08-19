<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'vintage',
        'region',
        'varietal',
        'category',
        'price',
        'compare_at_price',
        'stock_quantity',
        'is_allocated',
        'status_label',
        'status_bg',
        'soil',
        'alcohol',
        'tasting_note',
        'cover_image',
        'gallery',
        'published',
        'sort_order',
        'folder_id',
    ];

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    protected $casts = [
        'region' => 'array',
        'varietal' => 'array',
        'status_label' => 'array',
        'soil' => 'array',
        'tasting_note' => 'array',
        'gallery' => 'array',
        'price' => 'float',
        'compare_at_price' => 'float',
        'stock_quantity' => 'integer',
        'is_allocated' => 'boolean',
        'published' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Build an automatic slug combining name, category, and vintage.
     */
    public static function buildSlug(?string $name, ?string $category = null, ?string $vintage = null, ?int $ignoreId = null): string
    {
        $parts = array_values(array_filter([$name, $category, $vintage], function ($val) {
            return !empty($val) && trim((string) $val) !== '';
        }));

        $raw = implode('-', $parts);
        $base = Str::slug($raw);
        if (empty($base)) {
            $base = 'bottle-' . time();
        }

        $slug = $base;
        $counter = 1;
        while (static::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }

    protected static function booted()
    {
        static::creating(function ($product) {
            if (empty($product->slug)) {
                $product->slug = static::buildSlug($product->name, $product->category, $product->vintage);
            }
        });

        static::updating(function ($product) {
            if (empty($product->slug)) {
                $product->slug = static::buildSlug($product->name, $product->category, $product->vintage, $product->id);
            }
        });
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
