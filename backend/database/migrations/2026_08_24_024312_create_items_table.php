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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->string('item_code')->unique(); // e.g., SUP-PAPER-A4-2026-08
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('specifications')->nullable(); // e.g., "Short", "A4", "70gsm"
            $table->string('type')->nullable(); //if applicable only
            $table->string('unit_of_measure'); // pcs, ream, box, set, roll, liter, gallon
            $table->integer('reorder_level')->default(5);
            $table->enum('tracking_type', ['asset', 'consumable'])->default('consumable');
            $table->string('estimated_useful_life')->nullable(); // e.g. "5 Years", "3 Years"
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
