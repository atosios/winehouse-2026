<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'project_type',
        'message',
        'is_read',
        'status',
        'ip_address',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];
}
