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
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // transfered from
            $table->foreignId('transfered_to')->constrained('users')->onDelete('cascade');// transfered to
            $table->string('description'); // e.g., "Resigned/Retired", "Department Reassignment", "Defect/Maintenance" 
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
