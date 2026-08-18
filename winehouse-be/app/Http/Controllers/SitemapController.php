<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Generates a dynamic XML Sitemap for Google Search Console and web crawlers.
     */
    public function index(Request $request): Response
    {
        // Resolve frontend base origin
        $frontendUrl = env('FRONTEND_URL');
        if (empty($frontendUrl)) {
            $scheme = $request->getScheme();
            $host = $request->getHost();
            // Remove 'api.' subdomain prefix if present to map back to root frontend domain
            $frontendHost = preg_replace('/^api\./i', '', $host);
            if ($frontendHost === 'localhost' || $frontendHost === '127.0.0.1') {
                $frontendUrl = 'http://localhost:4200';
            } else {
                $frontendUrl = $scheme . '://' . $frontendHost;
            }
        }
        $frontendUrl = rtrim($frontendUrl, '/');

        // Backend origin for resolving image URLs
        $backendUrl = rtrim(config('app.url', 'http://localhost:8080'), '/');

        // Fetch published records
        $products = Product::where('published', true)->orderBy('updated_at', 'desc')->get();
        $pages = Page::where('published', true)->orderBy('updated_at', 'desc')->get();
        $posts = Post::where('published', true)->orderBy('updated_at', 'desc')->get();

        $now = date('c');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
        $xml .= '        xmlns:xhtml="http://www.w3.org/1999/xhtml"' . "\n";
        $xml .= '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

        // 1. Static Core Pages
        $staticPages = [
            ['loc' => $frontendUrl . '/', 'priority' => '1.0', 'changefreq' => 'daily', 'lastmod' => $now],
            ['loc' => $frontendUrl . '/shop', 'priority' => '0.9', 'changefreq' => 'daily', 'lastmod' => $now],
            ['loc' => $frontendUrl . '/about', 'priority' => '0.7', 'changefreq' => 'monthly', 'lastmod' => $now],
            ['loc' => $frontendUrl . '/contact', 'priority' => '0.7', 'changefreq' => 'monthly', 'lastmod' => $now],
        ];

        foreach ($staticPages as $page) {
            $escapedLoc = htmlspecialchars($page['loc'], ENT_XML1, 'UTF-8');
            $xml .= "  <url>\n";
            $xml .= "    <loc>" . $escapedLoc . "</loc>\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"el\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <lastmod>" . $page['lastmod'] . "</lastmod>\n";
            $xml .= "    <changefreq>" . $page['changefreq'] . "</changefreq>\n";
            $xml .= "    <priority>" . $page['priority'] . "</priority>\n";
            $xml .= "  </url>\n";
        }

        // 2. Dynamic Products
        foreach ($products as $prod) {
            $slug = !empty($prod->slug) ? $prod->slug : $prod->id;
            $loc = $frontendUrl . '/shop/' . $slug;
            $escapedLoc = htmlspecialchars($loc, ENT_XML1, 'UTF-8');
            $lastmod = $prod->updated_at ? $prod->updated_at->toIso8601String() : $now;

            $xml .= "  <url>\n";
            $xml .= "    <loc>" . $escapedLoc . "</loc>\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"el\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <lastmod>" . $lastmod . "</lastmod>\n";
            $xml .= "    <changefreq>weekly</changefreq>\n";
            $xml .= "    <priority>0.8</priority>\n";

            // Attach product image if present
            if (!empty($prod->cover_image)) {
                $imgUrl = $prod->cover_image;
                if (!str_starts_with($imgUrl, 'http://') && !str_starts_with($imgUrl, 'https://')) {
                    $cleanPath = ltrim($imgUrl, '/');
                    if (str_starts_with($cleanPath, 'storage/')) {
                        $imgUrl = $backendUrl . '/' . $cleanPath;
                    } else {
                        $imgUrl = $backendUrl . '/storage/' . $cleanPath;
                    }
                }

                $title = trim($prod->name . ($prod->vintage ? ' ' . $prod->vintage : ''));
                $xml .= "    <image:image>\n";
                $xml .= "      <image:loc>" . htmlspecialchars($imgUrl, ENT_XML1, 'UTF-8') . "</image:loc>\n";
                $xml .= "      <image:title>" . htmlspecialchars($title, ENT_XML1, 'UTF-8') . "</image:title>\n";
                $xml .= "    </image:image>\n";
            }

            $xml .= "  </url>\n";
        }

        // 3. Dynamic Pages (if any published)
        foreach ($pages as $page) {
            $loc = $frontendUrl . '/p/' . $page->slug;
            $escapedLoc = htmlspecialchars($loc, ENT_XML1, 'UTF-8');
            $lastmod = $page->updated_at ? $page->updated_at->toIso8601String() : $now;

            $xml .= "  <url>\n";
            $xml .= "    <loc>" . $escapedLoc . "</loc>\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"el\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <lastmod>" . $lastmod . "</lastmod>\n";
            $xml .= "    <changefreq>monthly</changefreq>\n";
            $xml .= "    <priority>0.6</priority>\n";
            $xml .= "  </url>\n";
        }

        // 4. Dynamic Posts / Editorial Stories (if any published)
        foreach ($posts as $post) {
            $loc = $frontendUrl . '/stories/' . $post->slug;
            $escapedLoc = htmlspecialchars($loc, ENT_XML1, 'UTF-8');
            $lastmod = $post->updated_at ? $post->updated_at->toIso8601String() : $now;

            $xml .= "  <url>\n";
            $xml .= "    <loc>" . $escapedLoc . "</loc>\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"el\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"" . $escapedLoc . "\" />\n";
            $xml .= "    <lastmod>" . $lastmod . "</lastmod>\n";
            $xml .= "    <changefreq>monthly</changefreq>\n";
            $xml .= "    <priority>0.6</priority>\n";
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
