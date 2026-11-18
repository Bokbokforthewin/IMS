<?php

/**
 * Sticker / PDF diagnostics. READ-ONLY: it changes nothing in your project.
 *
 * Save it in the backend folder (next to artisan), then run:
 *     php check-stickers.php
 * and paste the whole output back. Delete the file afterwards.
 */

error_reporting(E_ALL);

$problems = [];

function out(string $status, string $label, string $detail = ''): void
{
    printf("[%-4s] %-40s %s\n", $status, $label, $detail);
}

function section(string $title): void
{
    echo "\n== {$title}\n";
}

function mb($bytes): string
{
    return round($bytes / 1048576, 1) . ' MB';
}

/** Turns PHP warnings into exceptions, exactly like Laravel does while it handles a request. */
function strict(callable $fn)
{
    set_error_handler(function ($no, $str, $file, $line) {
        throw new ErrorException($str, 0, $no, $file, $line);
    });

    try {
        return $fn();
    } finally {
        restore_error_handler();
    }
}

// ---------------------------------------------------------------------------
section('1. The PHP that runs "php artisan serve"');
// ---------------------------------------------------------------------------
out('INFO', 'version', PHP_VERSION . ' (' . PHP_SAPI . ', ' . PHP_OS_FAMILY . ')');
out('INFO', 'binary', PHP_BINARY);
out('INFO', 'php.ini', php_ini_loaded_file() ?: '(none loaded)');
out('INFO', 'memory_limit', (string) ini_get('memory_limit'));

foreach (['gd', 'fileinfo', 'mbstring', 'dom', 'zlib'] as $ext) {
    $has = extension_loaded($ext);
    out($has ? 'OK' : 'FAIL', "extension: {$ext}");
    if (!$has) {
        $problems[] = "PHP extension '{$ext}' is not loaded (php.ini above).";
    }
}

if (function_exists('gd_info')) {
    $gd = gd_info();
    out(!empty($gd['PNG Support']) ? 'OK' : 'FAIL', 'GD can read PNG', !empty($gd['PNG Support']) ? 'yes' : 'NO');
    out('INFO', 'GD version', (string) ($gd['GD Version'] ?? '?'));
    if (empty($gd['PNG Support'])) {
        $problems[] = 'GD has no PNG support, so the PNG logos cannot load.';
    }
}

// ---------------------------------------------------------------------------
section('2. Temp folder (Dompdf writes every image here before drawing it)');
// ---------------------------------------------------------------------------
$tmp = sys_get_temp_dir();
out('INFO', 'folder', $tmp);
out(is_writable($tmp) ? 'OK' : 'FAIL', 'writable', is_writable($tmp) ? 'yes' : 'NO');

$probe = @tempnam($tmp, 'ca_dompdf_img_');
out($probe !== false ? 'OK' : 'FAIL', 'can create a temp file', $probe !== false ? 'yes' : 'tempnam() failed');
if ($probe !== false) {
    @unlink($probe);
} else {
    $problems[] = 'PHP cannot create temp files, so Dompdf cannot load any image.';
}

$names = @scandir($tmp) ?: [];
$total = count($names);
$leftovers = count(array_filter($names, fn ($n) => stripos($n, 'dompdf') !== false));
$status = $total >= 60000 ? 'FAIL' : ($total >= 20000 ? 'WARN' : 'OK');
out($status, 'files in the temp folder', number_format($total) . "  (Dompdf leftovers: " . number_format($leftovers) . ')');
if ($total >= 60000) {
    $problems[] = 'The temp folder is nearly full of files. Windows stops creating new temp names near 65,535 files, '
        . 'which makes every image fail. Empty the folder.';
}

$free = @disk_free_space($tmp);
if ($free !== false) {
    out($free < 200 * 1048576 ? 'WARN' : 'OK', 'free disk space there', mb($free));
}

// ---------------------------------------------------------------------------
section('3. Network: which address does this PC have right now?');
// ---------------------------------------------------------------------------
$ips = [];
if (PHP_OS_FAMILY === 'Windows') {
    foreach (explode("\n", (string) @shell_exec('ipconfig')) as $row) {
        if (stripos($row, 'IPv4') !== false && preg_match('/(\d+\.\d+\.\d+\.\d+)/', $row, $m)) {
            $ips[] = $m[1];
        }
    }
}
foreach ((array) @gethostbynamel(gethostname()) as $ip) {
    $ips[] = $ip;
}
$ips = array_values(array_unique(array_filter($ips)));
out('INFO', 'addresses on this PC now', $ips ? implode(', ', $ips) : 'could not detect (run ipconfig)');

$env = (string) @file_get_contents(__DIR__ . '/.env');
preg_match('/^APP_URL=(.*)$/m', $env, $m);
$appUrl = trim($m[1] ?? '', " \t\r\"'");
out('INFO', 'APP_URL in .env', $appUrl !== '' ? $appUrl : '(not set)');

$host = $appUrl !== '' ? parse_url($appUrl, PHP_URL_HOST) : null;
if ($host && $ips && !in_array($host, array_merge($ips, ['localhost', '127.0.0.1']), true)) {
    out('FAIL', 'APP_URL address belongs to this PC', "NO ({$host} is not one of this PC's addresses)");
    $problems[] = "APP_URL points at {$host}, which this PC no longer has. Every QR code made now encodes that dead address.";
} elseif ($host) {
    out('OK', 'APP_URL address belongs to this PC', 'yes');
}

if (is_file(__DIR__ . '/bootstrap/cache/config.php')) {
    out('WARN', 'config is cached', 'edits to .env are ignored until: php artisan config:clear');
    $problems[] = 'Laravel config is cached, so a changed APP_URL in .env is not used yet (php artisan config:clear).';
}

// ---------------------------------------------------------------------------
section('4. The logo files');
// ---------------------------------------------------------------------------
$logoPaths = [];
foreach (['DOH_Logo.png', 'Bagong_PilipinasTransparent.png'] as $file) {
    $found = null;
    foreach ([__DIR__ . '/public/' . $file, __DIR__ . '/public/images/' . $file] as $candidate) {
        if (is_file($candidate)) {
            $found = $candidate;
            break;
        }
    }

    if (!$found) {
        out('FAIL', $file, 'not found in public/ or public/images/');
        $problems[] = "{$file} is missing from public/.";
        continue;
    }

    $logoPaths[$file] = $found;
    $info = @getimagesize($found);
    out('INFO', $file, number_format(filesize($found) / 1024, 0) . ' KB, '
        . ($info ? "{$info[0]}x{$info[1]} px" : 'NOT READABLE AS AN IMAGE'));

    if (!$info) {
        $problems[] = "{$file} cannot be read as an image.";
        continue;
    }

    $needMb = ($info[0] * $info[1] * 5) / 1048576;
    if ($needMb > 40) {
        out('WARN', "  memory needed to decode", '~' . round($needMb) . ' MB (memory_limit is ' . ini_get('memory_limit') . ')');
        $problems[] = "{$file} is very large ({$info[0]}x{$info[1]}); decoding it can exhaust memory_limit.";
    }

    try {
        $img = strict(fn () => imagecreatefrompng($found));
        out('OK', '  decodes (warnings are fatal)', 'yes');
        imagedestroy($img);
    } catch (Throwable $e) {
        out('FAIL', '  decodes (warnings are fatal)', $e->getMessage());
        $problems[] = "{$file} makes PHP raise a warning when it is decoded: " . $e->getMessage();
    }
}

// ---------------------------------------------------------------------------
section('5. Dompdf, the real code path (boots your Laravel app)');
// ---------------------------------------------------------------------------
if (!is_file(__DIR__ . '/vendor/autoload.php') || !is_file(__DIR__ . '/bootstrap/app.php')) {
    out('SKIP', 'Laravel not found here', 'run this script from the backend folder (next to artisan)');
} else {
    try {
        require __DIR__ . '/vendor/autoload.php';
        $app = require __DIR__ . '/bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        out('INFO', 'config(app.url) at runtime', (string) config('app.url'));

        foreach (['dompdf/dompdf', 'barryvdh/laravel-dompdf', 'phenx/php-svg-lib', 'simplesoftwareio/simple-qrcode'] as $pkg) {
            try {
                out('INFO', "version: {$pkg}", Composer\InstalledVersions::getPrettyVersion($pkg));
            } catch (Throwable $e) {
                out('WARN', "version: {$pkg}", 'not installed');
            }
        }

        $dompdf = app('dompdf.wrapper')->getDomPDF();
        out('INFO', 'dompdf temp_dir', (string) $dompdf->getOptions()->getTempDir());
        out('INFO', 'dompdf chroot', json_encode($dompdf->getOptions()->getChroot()));

        // The images we test: the logo as-is, the logo re-encoded cleanly, a QR code, a 1px PNG.
        $tests = [];
        $firstLogo = reset($logoPaths) ?: null;

        if ($firstLogo) {
            $tests['logo, as the project loads it'] = 'data:image/png;base64,' . base64_encode(file_get_contents($firstLogo));

            $src = @imagecreatefrompng($firstLogo);
            if ($src) {
                $w = imagesx($src);
                $h = imagesy($src);
                $scale = min(1, 120 / max($w, $h));
                $dst = imagecreatetruecolor(max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale)));
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
                imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
                imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h);
                ob_start();
                imagepng($dst);
                $tests['logo, re-encoded small and clean'] = 'data:image/png;base64,' . base64_encode(ob_get_clean());
            }
        }

        $url = rtrim((string) config('app.url'), '/') . '/property-tag/1';
        $tests['QR code (SVG)'] = 'data:image/svg+xml;base64,' . base64_encode(
            (string) SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')->size(120)->margin(1)->generate($url)
        );
        $tests['1px PNG (control)'] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

        out('INFO', 'a new QR would open', $url);

        foreach ($tests as $name => $uri) {
            $GLOBALS['_dompdf_warnings'] = [];

            try {
                [$resolved, $type, $message] = Dompdf\Image\Cache::resolve_url($uri, '', '', '', $dompdf);
                $failed = $message !== null;
                $detail = $failed
                    ? 'FAILED to load: ' . implode(' | ', array_map(fn ($w) => preg_replace('/\s+/', ' ', substr((string) $w, 0, 160)), (array) ($GLOBALS['_dompdf_warnings'] ?? [])))
                    : "loads fine ({$type})";
                out($failed ? 'FAIL' : 'OK', "load: {$name}", $detail);
                if ($failed) {
                    $problems[] = "Dompdf cannot load: {$name}.";
                }
            } catch (Throwable $e) {
                out('FAIL', "load: {$name}", get_class($e) . ': ' . $e->getMessage());
                $problems[] = "Dompdf throws while loading {$name}: " . $e->getMessage();
            }

            // Then really draw it into a PDF, as a sticker would.
            try {
                $html = '<html><body><img src="' . $uri . '" width="40" height="40" alt="MISSING"></body></html>';
                $bytes = strlen(app('dompdf.wrapper')->loadHTML($html)->output());
                out('OK', "draw: {$name}", "PDF made ({$bytes} bytes)");
            } catch (Throwable $e) {
                out('FAIL', "draw: {$name}", get_class($e) . ': ' . $e->getMessage());
                $problems[] = "Drawing {$name} into a PDF throws: " . $e->getMessage();
            }
        }
    } catch (Throwable $e) {
        out('FAIL', 'could not run this section', get_class($e) . ': ' . $e->getMessage());
    }
}

// ---------------------------------------------------------------------------
section('Summary');
// ---------------------------------------------------------------------------
if (!$problems) {
    echo "Nothing obviously wrong was found. Paste the whole output back so we can look closer.\n";
} else {
    foreach ($problems as $i => $p) {
        echo ($i + 1) . '. ' . $p . "\n";
    }
}
echo "\n";