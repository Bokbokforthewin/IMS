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
            $table->foreignId('stock_batch_id')->constrained('stock_batches')->onDelete('cascade');
            $table->integer('quantity_issued');
            $table->string('issued_to'); // Name of employee or department
            $table->date('issuance_date');
            $table->string('purpose')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_issuances');
    }
};