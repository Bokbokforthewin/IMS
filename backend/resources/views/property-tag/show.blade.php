<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Tag — {{ $asset->property_number ?? 'N/A' }}</title>
    
    <!-- Tailwind CSS CDN for instant shadcn styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        border: "hsl(214.3 31.8% 91.4%)",
                        input: "hsl(214.3 31.8% 91.4%)",
                        ring: "hsl(222.2 84% 4.9%)",
                        background: "hsl(0 0% 100%)",
                        foreground: "hsl(222.2 84% 4.9%)",
                        primary: {
                            DEFAULT: "hsl(222.2 47.4% 11.2%)",
                            foreground: "hsl(210 40% 98%)",
                        },
                        secondary: {
                            DEFAULT: "hsl(210 40% 96.1%)",
                            foreground: "hsl(222.2 47.4% 11.2%)",
                        },
                        muted: {
                            DEFAULT: "hsl(210 40% 96.1%)",
                            foreground: "hsl(215.4 16.3% 46.9%)",
                        },
                        accent: {
                            DEFAULT: "hsl(210 40% 96.1%)",
                            foreground: "hsl(222.2 47.4% 11.2%)",
                        },
                    },
                    fontFamily: {
                        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        @media print {
            body { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .print-shadow-none { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
    </style>
</head>
<body class="bg-slate-50/50 text-slate-900 font-sans antialiased min-h-screen p-4 sm:p-8">

    @php
        // Safely extract the latest receipt line if the controller only passed the $asset
        $line = $line ?? $asset->lines()->latest()->first() ?? null;
        $attached = $attached ?? collect();
    @endphp

    <!-- Container Card (shadcn Card equivalent) -->
    <div class="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200/80 shadow-sm print-shadow-none overflow-hidden">
        
        <!-- Header / Banner -->
        <div class="p-6 pb-4 border-b border-slate-100 bg-slate-50/30">
            <div class="flex items-center justify-between gap-4">
                <div class="shrink-0">
                    <img src="{{ asset('images/DOH_Logo.png') }}" alt="DOH Logo" class="h-12 w-12 object-contain">
                </div>
                <div class="text-center flex-1 space-y-0.5">
                    <p class="text-[10px] tracking-widest uppercase font-semibold text-slate-400">
                        {{ config('app.country', 'Republic of the Philippines') }}
                    </p>
                    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {{ config('app.organization', 'Department of Health') }}
                    </h2>
                    <p class="text-[11px] font-medium text-slate-600">
                        {{ config('app.region', 'Regional Office') }} <br> Center of Health Development
                    </p>
                </div>
                <div class="shrink-0">
                    <img src="{{ asset('images/Bagong_PilipinasTransparent.png') }}" alt="Bagong Pilipinas" class="h-11 w-11 object-contain">
                </div>
            </div>
        </div>

        <!-- Card Header Section -->
        <div class="p-6 pb-4 space-y-3 border-b border-slate-100">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 class="text-xl font-semibold tracking-tight text-slate-900">
                    {{ $asset->item->name ?? 'Unknown Item' }}
                </h1>
                <div class="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 w-fit">
                    Property No: {{ $asset->property_number ?? 'N/A' }}
                </div>
            </div>
        </div>

        <!-- Card Content / Main Details Table -->
        <div class="p-6 space-y-6">
            <div class="rounded-lg border border-slate-200/80 overflow-hidden">
                <table class="w-full text-sm">
                    <tbody class="divide-y divide-slate-100">
                        
                        @if($line && $line->receipt)
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="w-2/5 px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Document Number</th>
                                <td class="px-4 py-3 font-medium text-slate-800">
                                    {{ $line->receipt->document_number }} 
                                    <span class="ml-1 text-xs font-semibold text-slate-500">({{ $line->receipt->receipt_type }})</span>
                                </td>
                            </tr>
                        @endif

                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <th class="w-2/5 px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Serial Number</th>
                            <td class="px-4 py-3 font-mono text-slate-700">{{ $asset->serial_number ?? 'N/A' }}</td>
                        </tr>

                        <!-- PAR / ICS Specific Details -->
                        @if($line && $line->receipt && $line->receipt->receipt_type === 'PAR')
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Manufacturer</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->manufacturer_name ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Brand & Model</th>
                                <td class="px-4 py-3 text-slate-700">{{ trim(($asset->item->brand ?? '') . '/' . ($asset->model ?? ''), '/ ') ?: 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Country of Origin</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->country_of_origin ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Date Acquired</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->created_at ? $asset->created_at->format('F j, Y') : 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Estimated Useful Life</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->item->estimated_useful_life ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Unit Cost</th>
                                <td class="px-4 py-3 font-semibold text-slate-900">₱{{ number_format($asset->unit_cost, 2) }}</td>
                            </tr>
                        @elseif($line && $line->receipt && $line->receipt->receipt_type === 'ICS')
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Brand</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->item->brand ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Model</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->model ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Specifications</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->item->specifications ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Inventory Item No.</th>
                                <td class="px-4 py-3 font-mono text-slate-700">{{ $asset->item->item_code ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Estimated Useful Life</th>
                                <td class="px-4 py-3 text-slate-700">{{ $asset->item->estimated_useful_life ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Unit Cost</th>
                                <td class="px-4 py-3 font-semibold text-slate-900">₱{{ number_format($asset->unit_cost, 2) }}</td>
                            </tr>
                        @endif

                        <!-- Status Badge Row -->
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Current Status</th>
                            <td class="px-4 py-3">
                                @php
                                    $status = strtolower($asset->status ?? 'available');
                                    $badgeClasses = [
                                        'assigned' => 'bg-blue-50 text-blue-700 border-blue-200',
                                        'available' => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                        'repair' => 'bg-amber-50 text-amber-700 border-amber-200',
                                        'condemned' => 'bg-rose-50 text-rose-700 border-rose-200',
                                    ][$status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
                                @endphp
                                <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors {{ $badgeClasses }}">
                                    {{ $asset->status ?? 'Available' }}
                                </span>
                            </td>
                        </tr>

                        <!-- Current User Row -->
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Current User</th>
                            <td class="px-4 py-3">
                                @if($asset->currentUser)
                                    <div class="font-semibold text-slate-900">{{ $asset->currentUser->name }}</div>
                                    <div class="text-xs text-slate-500">{{ $asset->currentUser->designation }}</div>
                                @else
                                    <span class="text-xs text-slate-400 italic">Not Assigned / Stock</span>
                                @endif
                            </td>
                        </tr>

                        @if($line && $line->receipt)
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Issued To</th>
                                <td class="px-4 py-3">
                                    <div class="font-semibold text-slate-900">{{ $line->receipt->user->name ?? 'N/A' }}</div>
                                    <div class="text-xs text-slate-500">{{ $line->receipt->user->designation ?? '' }}</div>
                                </td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Issued By</th>
                                <td class="px-4 py-3 text-slate-700">{{ $line->receipt->issuedBy->name ?? 'N/A' }}</td>
                            </tr>
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Date Issued</th>
                                <td class="px-4 py-3 text-slate-700">{{ \Carbon\Carbon::parse($line->receipt->date_issued)->format('F j, Y') }}</td>
                            </tr>
                        @endif

                        @if($line && $line->accessories_notes)
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <th class="px-4 py-3 text-left font-medium text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">Accessories</th>
                                <td class="px-4 py-3 text-slate-700">{{ $line->accessories_notes }}</td>
                            </tr>
                        @endif

                    </tbody>
                </table>
            </div>

            <!-- Bundled Items Section -->
            @if($attached && $attached->isNotEmpty())
                <div class="pt-4 border-t border-slate-100 space-y-3">
                    <h3 class="text-sm font-semibold tracking-tight text-slate-900">Bundled Items</h3>

                    @foreach($attached as $index => $child)
                        <div class="rounded-lg border border-slate-200/80 overflow-hidden">
                            @if($attached->count() > 1)
                                <div class="bg-slate-50 px-4 py-2 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                                    Bundled Item #{{ $index + 1 }}
                                </div>
                            @endif
                            <table class="w-full text-xs">
                                <tbody class="divide-y divide-slate-100">
                                    <tr class="hover:bg-slate-50/50">
                                        <th class="w-1/3 px-3 py-2 text-left font-medium text-slate-500 bg-slate-50/30">Item</th>
                                        <td class="px-3 py-2 text-slate-800 font-medium">{{ $child->item->name ?? 'Unknown' }}</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/50">
                                        <th class="px-3 py-2 text-left font-medium text-slate-500 bg-slate-50/30">Brand</th>
                                        <td class="px-3 py-2 text-slate-700">{{ $child->item->brand ?? 'N/A' }}</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/50">
                                        <th class="px-3 py-2 text-left font-medium text-slate-500 bg-slate-50/30">Model</th>
                                        <td class="px-3 py-2 text-slate-700">{{ $child->model ?? 'N/A' }}</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/50">
                                        <th class="px-3 py-2 text-left font-medium text-slate-500 bg-slate-50/30">Serial Number</th>
                                        <td class="px-3 py-2 font-mono text-slate-700">{{ $child->serial_number ?? $child->item->serial_number ?? 'N/A' }}</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/50">
                                        <th class="px-3 py-2 text-left font-medium text-slate-500 bg-slate-50/30">Cost</th>
                                        <td class="px-3 py-2 text-slate-800 font-semibold">₱{{ number_format($child->unit_cost ?? 0, 2) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    @endforeach
                </div>
            @endif
        </div>

        <!-- Footer / Actions (shadcn CardFooter style) -->
        <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {{ config('app.name') }}
            </div>
            
            <button 
                onclick="window.print()" 
                class="no-print inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50">
                <svg class="mr-2 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231a1.125 1.125 0 0 1-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656" />
                </svg>
                Print Details
            </button>
        </div>

    </div>

</body>
</html>