<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(
            \App\Models\User::select('id', 'name', 'unit', 'division', 'designation', 'is_head')
                ->orderBy('name')
                ->get(),
            200
        );
    }
}