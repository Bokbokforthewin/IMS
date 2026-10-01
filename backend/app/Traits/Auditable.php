<?php

namespace App\Traits;

use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            AuditLogger::log('created', $model, null, $model->getAttributes());
        });

        static::updated(function (Model $model) {
            /** @var \Illuminate\Database\Eloquent\Model $model */
            $changes = $model->getChanges();

            // Ignore timestamp-only updates
            unset($changes['updated_at']);

            if (empty($changes)) {
                return;
            }

            // Extract original values for modified keys only
            $oldValues = array_intersect_key($model->getOriginal(), $changes);
            $newValues = $changes;

            AuditLogger::log('updated', $model, $oldValues, $newValues);
        });

        static::deleted(function (Model $model) {
            AuditLogger::log('deleted', $model, $model->getAttributes(), null);
        });
    }
}