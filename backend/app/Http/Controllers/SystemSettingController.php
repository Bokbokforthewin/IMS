<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Readable by any authenticated user — the frontend needs this to
     * decide which workflow (simplified vs normalized) to show in the nav.
     */
    public function index()
    {
        return response()->json([
            'simplified_encoding_workflow' => SystemSetting::getBool('simplified_encoding_workflow', true),
        ], 200);
    }

    /**
     * Admin-only write. Flips which workflow is active app-wide.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'simplified_encoding_workflow' => 'required|boolean',
        ]);

        SystemSetting::setBool('simplified_encoding_workflow', $validated['simplified_encoding_workflow']);

        return response()->json([
            'message' => 'Settings updated.',
            'simplified_encoding_workflow' => $validated['simplified_encoding_workflow'],
        ], 200);
    }
}