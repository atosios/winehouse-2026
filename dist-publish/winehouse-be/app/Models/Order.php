<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'notes',
        'status',
        'subtotal',
        'tax',
        'shipping_cost',
        'total',
        'currency',
        'payment_status',
        'payment_method',
    ];

    protected $casts = [
        'shipping_address' => 'array',
        'subtotal' => 'float',
        'tax' => 'float',
        'shipping_cost' => 'float',
        'total' => 'float',
    ];

    protected static function booted()
    {
        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $year = date('Y');
                $count = static::whereYear('created_at', $year)->count() + 1;
                $order->order_number = sprintf('WH-%s-%04d', $year, $count);
            }
        });
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
