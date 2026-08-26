<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('accountability_receipts', function (Blueprint $table) {
            $table->id();
            $table->enum('receipt_type', ['ICS', 'PAR']);
            $table->string('document_number'); // Not unique, allows multi-item bundling (e.g., PAR-2026-08-001)
            
            // Employee relationships
            // $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade'); // Recipient
            // $table->foreignId('issued_by_id')->constrained('employees')->onDelete('cascade'); // Issuer Plantilla Personnel
            
            // Asset relationships
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            $table->foreignId('serialized_asset_id')->nullable()->constrained('serialized_assets')->onDelete('set null');
            
            $table->integer('quantity'); // Validated by dev controller: if serialized_asset_id != null, quantity = 1
            $table->date('date_issued');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accountability_receipts');
    }
};
