<?php

// Save as: app/Services/TagAssets.php

namespace App\Services;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * The image files used by the property-tag PDFs, shared by the single and bulk services.
 *
 * Dompdf is given plain file paths, never data: URIs. On some PHP builds Dompdf cannot load
 * data: URIs, while real files work, so every image the tags use is a file on disk.
 */
class TagAssets
{
    private const QR_DIR = 'app/tag-qr';

    /** What a tag's QR code opens. */
    public function tagUrl(int|string $assetId): string
    {
        return rtrim((string) config('app.url'), '/') . '/property-tag/' . $assetId;
    }

    /**
     * Absolute path of an SVG QR code for this URL. Created once, then reused, so printing
     * the same tag again (or a bundle) does not redraw it.
     * Kept in storage/ (inside the Laravel folder, so Dompdf may read it), not in public/.
     */
    public function qrSvgFile(string $url): string
    {
        $dir = storage_path(self::QR_DIR);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $path = $dir . DIRECTORY_SEPARATOR . 'qr_' . md5($url) . '.svg';

        if (!is_file($path) || filesize($path) === 0) {
            $writer = new Writer(new ImageRenderer(new RendererStyle(110, 1), new SvgImageBackEnd()));
            $writer->writeFile($url, $path);
        }

        return $path;
    }

    /** Absolute path of a logo in public/ (or public/images/), or '' when it is missing. */
    public function logoPath(string $filename): string
    {
        foreach ([public_path('images/' . $filename), public_path($filename)] as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return '';
    }

    /** Remove QR files not used for a while (for example codes made for an old APP_URL). */
    public function pruneOldQrFiles(int $days = 30): void
    {
        $limit = time() - ($days * 86400);

        foreach (glob(storage_path(self::QR_DIR) . DIRECTORY_SEPARATOR . 'qr_*.svg') ?: [] as $file) {
            if (@filemtime($file) < $limit) {
                @unlink($file);
            }
        }
    }
}