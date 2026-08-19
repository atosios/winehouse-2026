<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
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
        'body',
        'cover_image',
        'published',
        'published_at',
        'folder_id',
    ];

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'published_at' => 'datetime',
            'tags' => 'array',
            'meta_data' => 'array',
        ];
    }
}
