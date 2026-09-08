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
        Schema::create('stock_issuance_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_issuance_line_id')->constrained('stock_issuance_lines')->onDelete('cascade');
            $table->foreignId('stock_batch_id')->constrained('stock_batches')->onDelete('cascade');
            $table->integer('quantity_deducted');
            $table->decimal('unit_cost_at_issuance', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
