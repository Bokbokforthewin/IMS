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
            $table->string('document_number')->unique(); // one row per document now, so this can be unique
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // recipient
            $table->foreignId('issued_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_mr_by_id')->nullable()->constrained('users')->nullOnDelete();
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
