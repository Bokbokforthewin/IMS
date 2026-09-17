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
            $table->string('property_number')->unique()->nullable(); 
            $table->foreignId('current_holder_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('model')->nullable();
            $table->string('manufacturer_name')->nullable();
            $table->string('country_of_origin')->nullable();
            $table->decimal('unit_cost', 12, 2);
            $table->integer('quantity_on_hand')->default(0);
            $table->string('attached_to')->nullable();
            $table->enum('status', ['Available', 'Assigned', 'Under Repair', 'Condemned'])->default('Available');
            $table->string('pre_repair_status')->nullable();
            $table->text('condition_remarks')->nullable();
            $table->timestamps();
        });

        // Add self-referencing foreign key constraint after table & index are created
        Schema::table('serialized_assets', function (Blueprint $table) {
            $table->foreign('attached_to')
                ->references('property_number')
                ->on('serialized_assets')
                ->onDelete('cascade');
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
