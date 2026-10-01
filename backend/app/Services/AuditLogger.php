<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Jenssegers\Agent\Agent;

class AuditLogger
{
    public static function log(
        string $event,
        ?Model $model = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        // Prevent infinite recursion if AuditLog itself fires an event
        if ($model instanceof AuditLog) {
            return;
        }

        $request = request();
        $userAgent = $request->userAgent() ?? '';

        $browser = 'Unknown Browser';
        $os = 'Unknown OS';
        $deviceType = 'Desktop';

        if (!empty($userAgent)) {
            try {
                $agent = new Agent();
                $agent->setUserAgent($userAgent);

                $bName = $agent->browser();
                $bVer = $agent->version($bName);
                $browser = trim(sprintf('%s %s', $bName ?: '', $bVer !== false ? $bVer : ''));

                $osName = $agent->platform();
                $osVer = $agent->version($osName);
                $os = trim(sprintf('%s %s', $osName ?: '', $osVer !== false ? $osVer : ''));

                if ($agent->isTablet()) {
                    $deviceType = 'Tablet';
                } elseif ($agent->isPhone()) {
                    $deviceType = 'Mobile';
                }
            } catch (\Throwable $e) {
                // Fallback to default values if parsing fails
            }
        } elseif (app()->runningInConsole()) {
            $browser = 'CLI / Console';
            $os = PHP_OS;
            $deviceType = 'Server';
        }

        AuditLog::create([
            'user_id'        => Auth::id(),
            'event'          => $event,
            'auditable_type' => $model ? get_class($model) : null,
            'auditable_id'   => $model ? $model->getKey() : null,
            'old_values'     => $oldValues,
            'new_values'     => $newValues,
            'url'            => $request->fullUrl() ?? '',
            'ip_address'     => $request->ip() ?? '127.0.0.1',
            'browser'        => $browser ?: 'Unknown Browser',
            'os'             => $os ?: 'Unknown OS',
            'device'         => $deviceType,
        ]);
    }
}