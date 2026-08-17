<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Public order/allocation checkout submission.
     */
    public function publicStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.street' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['nullable', 'string', 'max:255'],
            'shipping_address.postal_code' => ['nullable', 'string', 'max:50'],
            'shipping_address.country' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'integer'],
            'items.*.product_name' => ['required', 'string', 'max:255'],
            'items.*.vintage' => ['nullable', 'string', 'max:50'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $order = DB::transaction(function () use ($validated) {
            $subtotal = 0;
            $itemsData = [];

            foreach ($validated['items'] as $rawItem) {
                $qty = (int) $rawItem['quantity'];
                $price = (float) $rawItem['price'];
                $lineTotal = $price * $qty;
                $subtotal += $lineTotal;

                // If productId is provided, verify/reduce stock if available
                $productId = $rawItem['product_id'] ?? null;
                if ($productId) {
                    $product = Product::find($productId);
                    if ($product && $product->stock_quantity >= $qty) {
                        $product->decrement('stock_quantity', $qty);
                    }
                }

                $itemsData[] = [
                    'product_id' => $productId,
                    'product_name' => $rawItem['product_name'],
                    'vintage' => $rawItem['vintage'] ?? null,
                    'price' => $price,
                    'quantity' => $qty,
                    'subtotal' => $lineTotal,
                ];
            }

            $order = Order::create([
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'tax' => 0.00,
                'shipping_cost' => 0.00,
                'total' => $subtotal,
                'currency' => 'EUR',
                'payment_status' => 'pending_bank',
                'payment_method' => 'bank_transfer',
            ]);

            foreach ($itemsData as $item) {
                $order->items()->create($item);
            }

            return $order->load('items');
        });

        return response()->json($order, 201);
    }

    /**
     * Admin list orders with optional status filter & search.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with('items')->orderBy('id', 'desc');

        if ($status = $request->query('status')) {
            if ($status !== 'ALL') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    /**
     * Admin show single order.
     */
    public function show(Order $order): JsonResponse
    {
        return response()->json($order->load('items.product'));
    }

    /**
     * Admin update order status / payment status.
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,confirmed,allocated,shipped,cancelled'],
            'payment_status' => ['nullable', 'string', 'in:pending_bank,paid,waived,refunded'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $order->update($validated);

        return response()->json($order->load('items'));
    }

    /**
     * Admin destroy order.
     */
    public function destroy(Order $order): JsonResponse
    {
        $order->delete();

        return response()->json(['success' => true]);
    }
}
