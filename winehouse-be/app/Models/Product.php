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
    ];

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

    protected static function booted()
    {
        static::creating(function ($product) {
            if (empty($product->slug)) {
                $base = Str::slug($product->name . ($product->vintage ? '-' . $product->vintage : ''));
                $slug = $base;
                $counter = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = $base . '-' . $counter++;
                }
                $product->slug = $slug;
            }
        });
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
