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

    /**
     * Download CSV template containing all headers and example rows.
     */
    public function downloadTemplateCsv(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="products_import_template.csv"',
        ];

        $columns = [
            'name',
            'vintage',
            'category',
            'price',
            'compare_at_price',
            'stock_quantity',
            'alcohol',
            'region_en',
            'region_el',
            'varietal_en',
            'varietal_el',
            'soil_en',
            'soil_el',
            'status_label_en',
            'status_label_el',
            'status_bg',
            'tasting_note_en',
            'tasting_note_el',
            'cover_image',
            'gallery',
            'is_allocated',
            'published'
        ];

        $sampleRows = [
            [
                'RITUÁL',
                '2024',
                'VOLCANIC',
                '45.00',
                '55.00',
                '50',
                '13.5%',
                'Pyrgos, Santorini PDO',
                'Πύργος, Σαντορίνη ΠΟΠ',
                '100% Assyrtiko',
                '100% Ασύρτικο',
                'Volcanic ash, pumice & basalt',
                'Ηφαιστειακή τέφρα, κίσσηρη & βασάλτης',
                'LIMITED ALLOCATION',
                'ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ',
                'bg-[#922e1b]',
                'Flint smoke, crushed sea salt, lemon blossom, bone-dry tension',
                'Καπνός πυρόλιθου, θαλασσινό αλάτι, άνθη λεμονιάς, κοφτερή οξύτητα',
                'cellar_ritual.jpg',
                'gallery1.jpg;gallery2.jpg',
                '1',
                '1'
            ],
            [
                'TERRA SILENTIA',
                '2021',
                'RESERVE',
                '68.00',
                '',
                '24',
                '14.0%',
                'Nemea PDO',
                'Νεμέα ΠΟΠ',
                '100% Agiorgitiko',
                '100% Αγιωργίτικο',
                'Limestone & gravel slopes',
                'Ασβεστολιθικές πλαγιές με χαλίκι',
                'CELLAR RESERVE',
                'ΠΑΛΑΙΩΣΗ RESERVE',
                'bg-[#551019]',
                'Black cherry, cedarwood, wild thyme, velvety tannins',
                'Μαύρο κεράσι, κέδρος, άγριο θυμάρι, βελούδινες τανίνες',
                'terra_silentia.jpg',
                '',
                '1',
                '1'
            ]
        ];

        return response()->stream(function () use ($columns, $sampleRows) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility with international characters
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $columns);
            foreach ($sampleRows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Import multiple products from uploaded CSV file.
     */
    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        if (!file_exists($path) || !is_readable($path)) {
            return response()->json(['error' => 'Unable to read uploaded file.'], 400);
        }

        $content = file_get_contents($path);
        // Remove UTF-8 BOM if present
        $bom = pack('H*', 'EFBBBF');
        $content = preg_replace("/^$bom/", '', $content);

        // Detect delimiter (comma or semicolon)
        $firstLine = strtok($content, "\r\n");
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $handle = fopen('php://memory', 'r+');
        fwrite($handle, $content);
        rewind($handle);

        $headers = fgetcsv($handle, 0, $delimiter);
        if (!$headers) {
            fclose($handle);
            return response()->json(['error' => 'The CSV file is empty or could not be parsed.'], 400);
        }

        // Normalize header keys (lowercase, trim, strip BOM)
        $normalizedHeaders = array_map(function ($h) {
            return strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h)));
        }, $headers);

        $nameIndex = array_search('name', $normalizedHeaders);
        if ($nameIndex === false) {
            fclose($handle);
            return response()->json([
                'error' => 'Missing required "name" header column in CSV.',
                'found_headers' => $headers
            ], 422);
        }

        $imported = [];
        $errors = [];
        $rowIndex = 1;

        \Illuminate\Support\Facades\DB::beginTransaction();

        try {
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rowIndex++;

                // Skip empty lines
                if (empty(array_filter($row, fn($v) => trim($v) !== ''))) {
                    continue;
                }

                $rowData = [];
                foreach ($normalizedHeaders as $idx => $header) {
                    if (isset($row[$idx])) {
                        $rowData[$header] = trim($row[$idx]);
                    }
                }

                $name = $rowData['name'] ?? '';
                if (empty($name)) {
                    $errors[] = "Row {$rowIndex}: Skipped because 'name' is empty.";
                    continue;
                }

                $price = 0.00;
                if (!empty($rowData['price'])) {
                    $cleanedPrice = str_replace([',', '$', '€', ' '], ['.', '', '', ''], $rowData['price']);
                    $price = (float) $cleanedPrice;
                }

                $compareAtPrice = null;
                if (!empty($rowData['compare_at_price'])) {
                    $cleanedCompare = str_replace([',', '$', '€', ' '], ['.', '', '', ''], $rowData['compare_at_price']);
                    $compareAtPrice = (float) $cleanedCompare;
                }

                $stockQty = 50;
                if (isset($rowData['stock_quantity']) && $rowData['stock_quantity'] !== '') {
                    $stockQty = (int) $rowData['stock_quantity'];
                }

                $vintage = $rowData['vintage'] ?? date('Y');
                $category = !empty($rowData['category']) ? strtoupper($rowData['category']) : 'VOLCANIC';
                $alcohol = !empty($rowData['alcohol']) ? $rowData['alcohol'] : '13.5%';
                $statusBg = !empty($rowData['status_bg']) ? $rowData['status_bg'] : 'bg-[#922e1b]';

                // Bilingual objects
                $region = [
                    'en' => $rowData['region_en'] ?? ($rowData['region'] ?? ''),
                    'el' => $rowData['region_el'] ?? ($rowData['region'] ?? '')
                ];

                $varietal = [
                    'en' => $rowData['varietal_en'] ?? ($rowData['varietal'] ?? ''),
                    'el' => $rowData['varietal_el'] ?? ($rowData['varietal'] ?? '')
                ];

                $soil = [
                    'en' => $rowData['soil_en'] ?? ($rowData['soil'] ?? ''),
                    'el' => $rowData['soil_el'] ?? ($rowData['soil'] ?? '')
                ];

                $statusLabel = [
                    'en' => $rowData['status_label_en'] ?? ($rowData['status_label'] ?? ''),
                    'el' => $rowData['status_label_el'] ?? ($rowData['status_label'] ?? '')
                ];

                $tastingNote = [
                    'en' => $rowData['tasting_note_en'] ?? ($rowData['tasting_note'] ?? ''),
                    'el' => $rowData['tasting_note_el'] ?? ($rowData['tasting_note'] ?? '')
                ];

                // Gallery array
                $gallery = [];
                if (!empty($rowData['gallery'])) {
                    $gallery = array_values(array_filter(
                        array_map('trim', preg_split('/[;,]/', $rowData['gallery'])),
                        fn($img) => !empty($img)
                    ));
                }

                // Booleans
                $isAllocated = true;
                if (isset($rowData['is_allocated'])) {
                    $val = strtolower($rowData['is_allocated']);
                    $isAllocated = !in_array($val, ['0', 'false', 'no', 'off', '']);
                }

                $published = true;
                if (isset($rowData['published'])) {
                    $val = strtolower($rowData['published']);
                    $published = !in_array($val, ['0', 'false', 'no', 'off']);
                }

                // Slug generation
                $base = Str::slug($name . ($vintage ? '-' . $vintage : ''));
                if (empty($base)) {
                    $base = 'bottle-' . time();
                }
                $slug = $base;
                $counter = 1;
                while (Product::where('slug', $slug)->exists()) {
                    $slug = $base . '-' . $counter++;
                }

                $product = Product::create([
                    'name' => $name,
                    'slug' => $slug,
                    'vintage' => $vintage,
                    'category' => $category,
                    'price' => $price,
                    'compare_at_price' => $compareAtPrice,
                    'stock_quantity' => $stockQty,
                    'alcohol' => $alcohol,
                    'region' => $region,
                    'varietal' => $varietal,
                    'soil' => $soil,
                    'status_label' => $statusLabel,
                    'status_bg' => $statusBg,
                    'tasting_note' => $tastingNote,
                    'cover_image' => $rowData['cover_image'] ?? '',
                    'gallery' => $gallery,
                    'is_allocated' => $isAllocated,
                    'published' => $published,
                    'sort_order' => isset($rowData['sort_order']) ? (int) $rowData['sort_order'] : 0,
                ]);

                $imported[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'vintage' => $product->vintage,
                    'price' => $product->price
                ];
            }

            fclose($handle);
            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'success' => true,
                'count' => count($imported),
                'imported' => $imported,
                'errors' => $errors,
                'message' => 'Successfully imported ' . count($imported) . ' product(s).'
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            fclose($handle);
            return response()->json([
                'error' => 'Failed to import CSV: ' . $e->getMessage()
            ], 500);
        }
    }
}
