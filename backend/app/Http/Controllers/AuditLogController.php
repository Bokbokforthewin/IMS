<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email')
            ->latest('id');

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "{$search}%") // Prefix match is significantly faster than %search%
                  ->orWhere('browser', 'like', "%{$search}%")
                  ->orWhere('os', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($u) use ($search) {
                      $u->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Return standard Laravel pagination payload
        $perPage = min((int) $request->get('per_page', 25), 100);
        return response()->json($query->paginate($perPage));
    }
}