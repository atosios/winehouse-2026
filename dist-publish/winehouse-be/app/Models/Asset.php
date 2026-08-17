<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Asset extends Model
{
    protected $fillable = ['name', 'path', 'mime_type', 'size'];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        if (empty($this->path)) {
            return '';
        }

        if (str_starts_with($this->path, 'http://') || str_starts_with($this->path, 'https://')) {
            return $this->path;
        }

        return url('storage/' . ltrim($this->path, '/'));
    }
}
