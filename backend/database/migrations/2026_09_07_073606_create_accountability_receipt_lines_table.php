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
            $table->foreignId('accountability_receipt_id')
                ->constrained('accountability_receipts')
                ->onDelete('cascade');
                
            $table->foreignId('item_id')
                ->nullable()
                ->constrained('items')
                ->nullOnDelete();

            // Define the serialized_asset_id foreign key properly:
            $table->foreignId('serialized_asset_id')
                ->nullable() // or omit ->nullable() if strictly required
                ->constrained('serialized_assets')
                ->onDelete('cascade');

            $table->integer('quantity')->default(1);
            $table->text('accessories_notes')->nullable();
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
