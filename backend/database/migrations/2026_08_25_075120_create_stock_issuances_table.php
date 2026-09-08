<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_issuances', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique(); // e.g., RIS-2026-08-001
            $table->date('issuance_date');
            $table->string('purpose')->nullable();
            $table->foreignId('issued_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_issuances');
    }
};