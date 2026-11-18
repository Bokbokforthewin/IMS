<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_attacker_reconnaissance_with_sql_injection_payloads()
    {
        // Black-hat technique: Fuzzing query strings with SQL payloads to test input sanitization
        $maliciousPayloads = [
            "1' OR '1'='1",
            "1; DROP TABLE users;",
            "UNION SELECT * FROM users",
        ];

        foreach ($maliciousPayloads as $payload) {
            $response = $this->getJson("/api/v1/serialized-assets?search=" . urlencode($payload));
            
            // Must block unauthenticated access (401) or handle it safely without crashing (never 500)
            $this->assertContains($response->status(), [401, 403, 422, 200]);
            $this->assertNotEquals(500, $response->status(), "Endpoint crashed with SQL injection payload: {$payload}");
        }
    }

    public function test_unauthenticated_user_cannot_bypass_auth_with_malformed_tokens()
    {
        // Simulating token injection attacks
        $spoofedTokens = [
            'Bearer ',
            'Bearer 1\' OR \'1\'=\'1',
            'Basic YWRtaW46cGFzc3dvcmQ=', // Wrong authorization type
            'Bearer invalid_token_format_structure',
        ];

        foreach ($spoofedTokens as $token) {
            $response = $this->withHeader('Authorization', $token)
                             ->getJson('/api/v1/serialized-assets');

            $response->assertUnauthorized(); // Must always return 401
        }
    }

    public function test_vertical_privilege_escalation_is_blocked()
    {
        // Arrange: Create a standard low-privilege 'end_user'
        $role = Role::firstOrCreate(['name' => 'end_user', 'guard_name' => 'sanctum']);
        $user = User::factory()->create([
            'unit' => 'ICTU',
            'division' => 'Management Support',
            'designation' => 'Staff',
        ]);
        $user->assignRole($role);

        // Act: The attacker tries to escalate privileges by hitting restricted admin/management routes
        $adminEndpoints = [
            ['method' => 'get', 'uri' => '/api/v1/users'],
            ['method' => 'post', 'uri' => '/api/v1/users'],
            ['method' => 'get', 'uri' => '/api/v1/permissions-matrix'],
            ['method' => 'put', 'uri' => '/api/v1/settings'],
        ];

        foreach ($adminEndpoints as $endpoint) {
            $response = $this->actingAs($user, 'sanctum')
                             ->json($endpoint['method'], $endpoint['uri']);

            // Assert: Every single attempt must be strictly forbidden
            $response->assertForbidden(); // 403
        }
    }

    public function test_unauthorized_mutation_tampering_is_blocked()
    {
        $role = Role::firstOrCreate(['name' => 'end_user', 'guard_name' => 'sanctum']);
        $user = User::factory()->create([
            'unit' => 'ICTU',
            'division' => 'Management Support',
            'designation' => 'Staff',
        ]);
        $user->assignRole($role);

        // Try to create categories/items without catalog permissions
        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/v1/categories', ['name' => 'Hacked Category']);

        $response->assertForbidden(); // 403
    }

    public function test_authorized_admin_can_access_secure_endpoints()
    {
        $permission = Permission::firstOrCreate(['name' => 'view:assets_page', 'guard_name' => 'sanctum']);
        $user = User::factory()->create([
            'unit' => 'ICTU',
            'division' => 'Management Support',
            'designation' => 'Administrator',
        ]);
        $user->givePermissionTo($permission);

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/v1/serialized-assets');

        $response->assertSuccessful(); // 200
    }
}