<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'name' => config('app.name'),
            'organization' => config('app.organization'),
            'region' => config('app.region'),
            'country' => config('app.country'),
        ]);
    }
}