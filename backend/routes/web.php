<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PropertyTagController;

Route::get('/property-tag/{line}', [PropertyTagController::class, 'show'])->name('property-tag.show');

Route::get('/', function () {
    return view('welcome');
});
