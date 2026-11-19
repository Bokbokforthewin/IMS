<?php

declare(strict_types=1);

use Tests\Feature\Security\SecurityTestCase;

/*
|--------------------------------------------------------------------------
| Security suite bootstrap  (MERGE into your existing tests/Pest.php)
|--------------------------------------------------------------------------
| Every file under tests/Feature/Security runs on SecurityTestCase
| (RefreshDatabase + sanctum-guard RBAC seeding + token helpers) and is
| tagged with the "security" group:
|
|     ./vendor/bin/pest --group=security
|     php artisan test --group=security
*/
uses(SecurityTestCase::class)->group('security')->in('Feature/Security');