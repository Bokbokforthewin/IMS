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
        Schema::create('accountability_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accountability_receipt_id')->constrained('accountability_receipts')->onDelete('cascade');
            $table->foreignId('serialized_asset_id')->constrained('serialized_assets')->onDelete('cascade');
            $table->text('accessories_notes')->nullable(); // e.g. "Includes keyboard SN:..., mouse SN:..."
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accountability_receipt_lines');
    }
};
