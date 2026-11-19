<?php

declare(strict_types=1);

use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Shared security datasets (auto-loaded by Pest from tests/Datasets)
|--------------------------------------------------------------------------
*/

dataset('admin_surface', fn () => Endpoints::adminSurface());
dataset('protected_surface', fn () => Endpoints::protectedSurface());
dataset('foreign_asset_mutations', fn () => Endpoints::assetMutations());

/** Garbage that must be rejected with 401 and never reach a 500. */
dataset('malformed_tokens', [
    'empty'                 => [''],
    'literal null'          => ['null'],
    'literal undefined'     => ['undefined'],
    'random string, no id'  => [str_repeat('a', 40)],
    'unknown token id'      => ['999999|' . str_repeat('a', 40)],
    'non-numeric id'        => ['abc|' . str_repeat('a', 40)],
    'negative id'           => ['-1|' . str_repeat('a', 40)],
    'sql injection in id'   => ["1' OR '1'='1|" . str_repeat('a', 40)],
    'sql injection in body' => ["1|' OR 1=1 --"],
    'JWT alg=none'          => [
        rtrim(strtr(base64_encode('{"alg":"none","typ":"JWT"}'), '+/', '-_'), '=') . '.'
        . rtrim(strtr(base64_encode('{"sub":1,"admin":true}'), '+/', '-_'), '=') . '.',
    ],
    'oversized (8 KB)'      => [str_repeat('A', 8192)],
    'unicode lookalikes'    => ['１|ａｂｃｄｅｆ'],
    'only a pipe'           => ['|'],
    'repeated pipes'        => ['1|2|3|4'],
]);

/** Mutations applied to a genuine token; every one must yield 401. */
dataset('token_mutations', [
    'flip last character'  => [fn (string $t): string => substr($t, 0, -1) . (str_ends_with($t, 'a') ? 'b' : 'a')],
    'flip first secret char' => [function (string $t): string {
        [$id, $secret] = explode('|', $t, 2);

        return $id . '|' . ($secret[0] === 'a' ? 'b' : 'a') . substr($secret, 1);
    }],
    'truncate to half'     => [fn (string $t): string => substr($t, 0, intdiv(strlen($t), 2))],
    'append a character'   => [fn (string $t): string => $t . 'x'],
    'prepend a character'  => [fn (string $t): string => 'x' . $t],
    'wrong (nonexistent) id' => [fn (string $t): string => '999999|' . explode('|', $t, 2)[1]],
    'doubled token'        => [fn (string $t): string => $t . $t],
]);

/** Identity-asserting headers an attacker may add; none may authenticate or elevate. */
dataset('spoofed_identity_headers', [
    'X-User-Id'              => [['X-User-Id' => '1']],
    'X-Auth-User'            => [['X-Auth-User' => 'admin']],
    'X-Authenticated-User'   => [['X-Authenticated-User' => 'admin']],
    'X-Forwarded-User'       => [['X-Forwarded-User' => 'admin']],
    'X-Remote-User'          => [['X-Remote-User' => 'admin']],
    'REMOTE_USER'            => [['REMOTE_USER' => 'admin']],
    'X-Original-User'        => [['X-Original-User' => '1']],
    'X-Impersonate'          => [['X-Impersonate' => '1']],
    'X-Role'                 => [['X-Role' => 'admin']],
    'X-Is-Admin'             => [['X-Is-Admin' => 'true']],
    'X-Permissions'          => [['X-Permissions' => 'users.manage,roles.manage']],
    'X-Forwarded-For local'  => [['X-Forwarded-For' => '127.0.0.1']],
    'X-Real-IP local'        => [['X-Real-IP' => '127.0.0.1']],
    'X-Original-URL'         => [['X-Original-URL' => '/api/users']],
    'X-Rewrite-URL'          => [['X-Rewrite-URL' => '/api/users']],
]);

/** Privilege-bearing attributes (many shapes) that must never be mass-assigned. */
dataset('privilege_injections', [
    'is_admin boolean'      => [['is_admin' => true]],
    'is_admin string'       => [['is_admin' => '1']],
    'is_superuser'          => [['is_superuser' => true]],
    'camelCase isAdmin'     => [['isAdmin' => true]],
    'UPPERCASE IS_ADMIN'    => [['IS_ADMIN' => true]],
    'role name'             => [['role' => 'admin']],
    'roles array'           => [['roles' => ['admin']]],
    'roles as objects'      => [['roles' => [['name' => 'admin', 'guard_name' => 'sanctum']]]],
    'role_id'               => [['role_id' => 1]],
    'role_ids array'        => [['role_ids' => [1, 2, 3]]],
    'permissions array'     => [['permissions' => ['users.manage', 'roles.manage']]],
    'permissions wildcard'  => [['permissions' => ['*']]],
    'permission_ids'        => [['permission_ids' => [1, 2, 3]]],
    'nested user wrapper'   => [['user' => ['is_admin' => true, 'roles' => ['admin']]]],
    'dotted keys'           => [['roles.0' => 'admin', 'permissions.0' => 'users.manage']],
    'pivot table smuggling' => [['model_has_roles' => [['role_id' => 1]]]],
    'guard_name override'   => [['guard_name' => 'web']],
    'verified + active'     => [['email_verified_at' => '2020-01-01 00:00:00', 'is_active' => true]],
]);

/** Asset columns an attacker must not be able to rewrite through a plain update. */
dataset('protected_asset_fields', [
    'id'            => ['id', 999999],
    'department_id' => ['department_id', '__foreign_department__'],
    'status'        => ['status', Endpoints::STATUS_RETIRED],
    'created_by'    => ['created_by', 999999],
    'created_at'    => ['created_at', '2000-01-01 00:00:00'],
    'deleted_at'    => ['deleted_at', '2000-01-01 00:00:00'],
]);

/** Query strings that probe injection, coercion, pollution and DoS. Never 5xx, never a leak. */
dataset('hostile_queries', [
    'array on scalar filter'   => ['status[]=available&status[]=distributed'],
    'deeply nested array'      => ['status[a][b][c][d]=1'],
    'mongo-style operator'     => ['status[$ne]=available'],
    'bracket operator'         => ['filter[status][like]=%25'],
    'sql quote'                => ["search=' OR '1'='1"],
    'sql comment'              => ['search=1;--'],
    'sql union'                => ['search=%27%20UNION%20SELECT%20password%20FROM%20users--'],
    'sql stacked'              => ['search=1%3BDROP%20TABLE%20users'],
    'sort injection'           => ['sort=id%3BDROP%20TABLE%20users'],
    'sort sensitive column'    => ['sort=password'],
    'sort as array'            => ['sort[]=id&sort[]=-id'],
    'direction injection'      => ['direction=asc%3Bselect'],
    'per_page negative'        => ['per_page=-1'],
    'per_page zero'            => ['per_page=0'],
    'per_page huge'            => ['per_page=2147483648'],
    'per_page float overflow'  => ['per_page=1e309'],
    'per_page string'          => ['per_page=abc'],
    'per_page array'           => ['per_page[]=10'],
    'page zero'                => ['page=0'],
    'page negative'            => ['page=-5'],
    'page array'               => ['page[]=1'],
    'page overflow'            => ['page=99999999999999999999'],
    'parameter pollution'      => ['status=available&status=distributed&status='],
    'mixed scalar/array'       => ['department_id=1&department_id[]=2'],
    'null byte'                => ['search=%00'],
    'unicode + RTL override'   => ['search=%F0%9F%92%A5%E2%80%AE'],
    'overlong value (10 KB)'   => ['search=' . str_repeat('A', 10000)],
    'include traversal'        => ['include=users.password'],
    'include prototype key'    => ['include=__proto__'],
    'sparse fieldset leak'     => ['fields[users]=password,remember_token'],
    'boolean coercion'         => ['is_active=maybe'],
    'integer coercion'         => ['department_id=1abc'],
    'malformed dates'          => ['from=9999-99-99&to=not-a-date'],
    'prototype pollution'      => ['__proto__[admin]=1&constructor[prototype][admin]=1'],
    'extreme nesting'          => ['a' . str_repeat('[b]', 200) . '=1'],
]);

/** Type-confused / oversized field values for create & update bodies. */
dataset('hostile_bodies', [
    'array for string'      => [['name' => ['x'], 'serial_number' => ['y']]],
    'object operator'       => [['serial_number' => ['$ne' => null]]],
    'integer overflow'      => [['name' => PHP_INT_MAX]],
    'negative number'       => [['name' => -1]],
    'NaN string'            => [['name' => 'NaN']],
    'boolean for string'    => [['name' => true]],
    'null fields'           => [['name' => null, 'serial_number' => null]],
    'overlong (1 MB)'       => [['name' => str_repeat('A', 1_000_000)]],
    'sql payload'           => [['name' => "'); DROP TABLE assets;--"]],
    'xss payload'           => [['name' => '<script>alert(1)</script>']],
    'null bytes'            => [['name' => "abc\0def"]],
    'emoji + RTL override'  => [['name' => "\u{202E}\u{1F4A5}\u{200B}"]],
    'deeply nested array'   => [['name' => json_decode(str_repeat('[', 100) . '1' . str_repeat(']', 100), true)]],
]);

/** Raw request bodies with mismatched content types / broken syntax. */
dataset('malformed_raw_bodies', [
    'truncated JSON'        => ['application/json', '{"name":'],
    'JSON empty array'      => ['application/json', '[]'],
    'JSON null'             => ['application/json', 'null'],
    'JSON scalar'           => ['application/json', '"string"'],
    'JSON deep nesting'     => ['application/json', str_repeat('[', 5000)],
    'invalid UTF-8'         => ['application/json', "\xB1\x31"],
    'empty JSON body'       => ['application/json', ''],
    'text/plain'            => ['text/plain', 'name=x'],
    'XML with XXE'          => ['application/xml', '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><a>&e;</a>'],
    'urlencoded arrays'     => ['application/x-www-form-urlencoded', 'name[]=a&name[][]=b'],
    'broken multipart'      => ['multipart/form-data', 'garbage'],
]);

/** Route-parameter abuse for /api/assets/{param}. */
dataset('hostile_route_params', [
    'alphabetic'        => ['abc'],
    'negative'          => ['-1'],
    'zero'              => ['0'],
    'bigint overflow'   => ['99999999999999999999'],
    'float'             => ['1.5'],
    'sql tautology'     => ['1%20OR%201%3D1'],
    'path traversal'    => ['..%2F..%2Fetc%2Fpasswd'],
    'null byte'         => ['%00'],
    'literal null'      => ['null'],
    'RTL override'      => ['%E2%80%AE'],
    'stacked query'     => ['1%3BDROP%20TABLE%20assets'],
]);

/** Filters meant to widen scope past the caller's department. {A}/{B} are replaced at runtime. */
dataset('scope_bypass_queries', [
    'department_id scalar'        => ['department_id={B}'],
    'filter[department_id]'       => ['filter[department_id]={B}'],
    'department_id array'         => ['department_id[]={A}&department_id[]={B}'],
    'department_id pollution'     => ['department_id={A}&department_id={B}'],
    'department alias'            => ['department={B}'],
    'scope=all'                   => ['scope=all'],
    'all=1'                       => ['all=1'],
    'withoutGlobalScopes'         => ['withoutGlobalScopes=1'],
    'include department assets'   => ['include=department.assets'],
    'with department'             => ['with=department'],
    'huge page + foreign filter'  => ['per_page=1000&department_id={B}'],
    'search for foreign serial'   => ['search=SN-FOREIGN'],
]);