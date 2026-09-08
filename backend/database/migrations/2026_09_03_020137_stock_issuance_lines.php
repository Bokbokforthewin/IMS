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
        Schema::create('stock_issuance_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_issuance_id')->constrained('stock_issuances')->onDelete('cascade');
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            $table->foreignId('issued_to_id')->constrained('users')->onDelete('cascade');
            $table->integer('quantity_issued');
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
