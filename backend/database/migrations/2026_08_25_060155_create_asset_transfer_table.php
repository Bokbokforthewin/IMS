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
        Schema::create('asset_transfer', function (Blueprint $table) {
            $table->id();
            $table->string('document_number'); // e.g., PTR-2026-08-001
            $table->enum('transfer_type', ['RETURN', 'TRANSFER']);
            $table->foreignId('serialized_asset_id')->constrained('serialized_assets')->onDelete('cascade');
            
            // Employee relationships
            // $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade'); transfered from
            // $table->foreignId('transfered_to')->constrained('employees')->onDelete('cascade');// transfered to
            // Transfer details
            $table->string('from_office')->nullable();
            $table->string('to_office')->nullable();
            $table->string('reason'); // e.g., "Resigned/Retired", "Department Reassignment", "Defect/Maintenance"
            $table->date('transfer_date');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_transfer');
    }
};
