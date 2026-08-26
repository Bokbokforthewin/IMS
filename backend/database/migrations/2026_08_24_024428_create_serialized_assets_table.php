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
        Schema::create('serialized_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            $table->string('serial_number')->unique()->nullable();
            $table->string('property_number')->unique(); // e.g., DOH NIR-2026-04-00106
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->decimal('unit_cost', 12, 2);
            $table->enum('status', ['Available', 'Assigned', 'Under Repair', 'Condemned'])->default('Available');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('serialized_assets');
    }
};
