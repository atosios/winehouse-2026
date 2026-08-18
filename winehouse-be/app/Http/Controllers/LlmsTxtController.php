<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LlmsTxtController extends Controller
{
    /**
     * Generates a standard /llms.txt summary for LLM search engines (Perplexity, SearchGPT, Claude, Gemini).
     */
    public function index(Request $request): Response
    {
        $settings = Setting::allSettings();
        $siteName = $settings['name'] ?? 'The Winehouse';
        $tagline = $settings['tagline'] ?? 'A house of wine, stories & slow living';
        $desc = $settings['description'] ?? 'Curated wines from small vineyards, tales from the cellar, tastings and tours.';
        
        $frontendUrl = $this->resolveFrontendUrl($request);

        $out = "# {$siteName}\n\n";
        $out .= "> {$tagline}\n\n";
        $out .= "{$desc}\n\n";

        $out .= "## Core Concepts & Philosophy\n";
        $out .= "- **Independent Artisanal Growers**: We source directly from small Mediterranean family vineyards practicing biodynamic and low-intervention viticulture.\n";
        $out .= "- **Ancestral Terroir Focus**: Specializing in volcanic ungrafted Santorini Assyrtiko, ancient indigenous Cretan Vidiano, and cool-climate Naoussa Xinomavro.\n";
        $out .= "- **Living Soil & Native Fermentations**: Unfiltered natural wines, zero chemical additives, and spontaneous wild yeast fermentations.\n\n";

        $out .= "## Key URLs & Sections\n";
        $out .= "- [Atelier Home]({$frontendUrl}/): Cellar introductions, tasting philosophies, and grower spotlights.\n";
        $out .= "- [Curated e-Shop]({$frontendUrl}/shop): Current small-batch harvest allocations, rare vintage archives, and natural selections.\n";
        $out .= "- [About the House]({$frontendUrl}/about): Estate story, vineyard benchmarks, and house principles.\n";
        $out .= "- [Contact & Tastings]({$frontendUrl}/contact): Sommelier appointments, private group tastings, and cellar consulting.\n\n";

        $out .= "## Cellar Coordinates\n";
        $contact = $settings['contact'] ?? [];
        $email = $contact['email'] ?? 'hello@thewinehouse.gr';
        $phone = $contact['phone'] ?? '+30 210 000 0000';
        $out .= "- Email: {$email}\n";
        $out .= "- Phone: {$phone}\n";
        if (!empty($contact['address']['street'])) {
            $out .= "- Address: " . trim(($contact['address']['street'] ?? '') . ', ' . ($contact['address']['city'] ?? '') . ' ' . ($contact['address']['postalCode'] ?? '') . ' ' . ($contact['address']['country'] ?? '')) . "\n";
        }
        $out .= "\n";

        $out .= "## Feeds & Machine-Readable Endpoints\n";
        $out .= "- [Full LLM Context]({$frontendUrl}/llms-full.txt): Complete markdown dump of all current allocations and tasting notes.\n";
        $out .= "- [XML Sitemap]({$frontendUrl}/sitemap.xml): Search engine crawler index with image and multilingual hreflang metadata.\n";

        return response($out, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * Generates a deep /llms-full.txt containing the full product catalog and cellar notes for AI crawlers.
     */
    public function full(Request $request): Response
    {
        $settings = Setting::allSettings();
        $siteName = $settings['name'] ?? 'The Winehouse';
        $frontendUrl = $this->resolveFrontendUrl($request);

        $products = Product::where('published', true)->orderBy('name')->get();
        $posts = Post::where('published', true)->orderBy('created_at', 'desc')->get();

        $out = "# {$siteName} — Complete Knowledge Base & Cellar Ledger\n\n";

        $out .= "## Published Wine Catalog & Tasting Archive\n\n";
        if ($products->isEmpty()) {
            $out .= "*(Allocations ledger is currently undergoing seasonal curation.)*\n\n";
        } else {
            foreach ($products as $p) {
                $vintageStr = $p->vintage ? " ({$p->vintage})" : '';
                $out .= "### {$p->name}{$vintageStr}\n";
                $out .= "- **Price**: €" . number_format((float)$p->price, 2) . "\n";
                if ($p->category) {
                    $out .= "- **Category**: {$p->category}\n";
                }
                
                $varietal = is_array($p->varietal) ? ($p->varietal['en'] ?? '') : $p->varietal;
                if ($varietal) {
                    $out .= "- **Grape Varietal**: {$varietal}\n";
                }
                
                $region = is_array($p->region) ? ($p->region['en'] ?? '') : $p->region;
                if ($region) {
                    $out .= "- **Terroir / Region**: {$region}\n";
                }

                if ($p->alcohol) {
                    $out .= "- **ABV**: {$p->alcohol}\n";
                }

                $tasting = is_array($p->tasting_note) ? ($p->tasting_note['en'] ?? '') : $p->tasting_note;
                if ($tasting) {
                    $out .= "- **Sommelier Tasting Note**: {$tasting}\n";
                }

                $slug = !empty($p->slug) ? $p->slug : $p->id;
                $out .= "- **Direct URL**: {$frontendUrl}/shop/{$slug}\n\n";
            }
        }

        if ($posts->isNotEmpty()) {
            $out .= "## Cellar Stories & Editorial Dispatches\n\n";
            foreach ($posts as $post) {
                $out .= "### {$post->title}\n";
                if ($post->excerpt) {
                    $out .= "{$post->excerpt}\n\n";
                }
                $out .= "- Read Story: {$frontendUrl}/stories/{$post->slug}\n\n";
            }
        }

        return response($out, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function resolveFrontendUrl(Request $request): string
    {
        $frontendUrl = env('FRONTEND_URL');
        if (empty($frontendUrl)) {
            $scheme = $request->getScheme();
            $host = $request->getHost();
            $frontendHost = preg_replace('/^api\./i', '', $host);
            if ($frontendHost === 'localhost' || $frontendHost === '127.0.0.1') {
                $frontendUrl = 'http://localhost:4200';
            } else {
                $frontendUrl = $scheme . '://' . $frontendHost;
            }
        }
        return rtrim($frontendUrl, '/');
    }
}
