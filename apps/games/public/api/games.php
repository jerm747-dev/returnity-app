<?php
// Optional, for PHP hosting (GoDaddy/cPanel and similar): lists every folder in ../projects that has
// an index.html, live, so uploading a game folder puts it on the shelf with no rebuild.
// Without PHP the cabinet uses projects/index.json, made by `npm run build`.
declare(strict_types=1);

function respond(array $payload): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function clean(?string $s, int $max = 500): string {
    $s = preg_replace('/[\x00-\x1F]/u', ' ', trim((string)$s)) ?? '';
    return mb_substr($s, 0, $max);
}

$root = dirname(__DIR__) . '/projects';
$kinds = ['game', 'app', 'site', 'tool', 'music', 'experiment'];
$statuses = ['prototype', 'in_progress', 'playable', 'stable', 'client'];
$out = [];

foreach (glob($root . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
    $slug = basename($dir);
    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/', $slug) || !is_file("$dir/index.html")) continue;
    $m = is_file("$dir/project.json") ? (json_decode((string)file_get_contents("$dir/project.json"), true) ?: []) : [];
    if (!empty($m['hidden'])) continue;

    $cover = '';
    foreach (['cover.webp', 'cover.png', 'cover.jpg', 'cover.jpeg', 'cover.gif'] as $c) {
        if (is_file("$dir/$c")) { $cover = "projects/$slug/$c?v=" . filemtime("$dir/$c"); break; }
    }
    $html = (string)file_get_contents("$dir/index.html", false, null, 0, 4096);
    $title = $m['title'] ?? (preg_match('/<title>([^<]{1,80})<\/title>/i', $html, $t) ? html_entity_decode(trim($t[1])) : ucwords(str_replace(['-', '_'], ' ', $slug)));
    $updated = max(filemtime("$dir/index.html"), is_file("$dir/project.json") ? filemtime("$dir/project.json") : 0);

    $bridge = [];
    $labels = [];
    $btns = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
    foreach ((array)($m['gamepad'] ?? []) as $btn => $key) {
        if (in_array($btn, $btns, true) && is_string($key) && $key !== '' && mb_strlen($key) <= 20) {
            $bridge[$btn] = $key;
            $labels[$btn] = clean((string)(($m['gamepadLabels'] ?? [])[$btn] ?? ''), 30);
        }
    }

    // Optional download link shown on the game's page, e.g. {"label": "Android APK", "url": "/download/gs-fighter-3/"}
    $download = null;
    $dl = $m['download'] ?? null;
    if (is_array($dl) && is_string($dl['url'] ?? null) && preg_match('#^(/[A-Za-z0-9._~/-]*|https://[^\s"<>]{1,300})$#', $dl['url'])) {
        $download = ['url' => $dl['url'], 'label' => clean((string)($dl['label'] ?? 'Download'), 40) ?: 'Download'];
    }

    // Optional screenshots: [{"src": "screenshots/01.webp", "thumb": "screenshots/01-thumb.webp", "caption": "..."}]
    $shots = [];
    foreach (array_slice((array)($m['screenshots'] ?? []), 0, 12) as $sh) {
        $src = is_array($sh) ? (string)($sh['src'] ?? '') : (string)$sh;
        $thumb = is_array($sh) ? (string)($sh['thumb'] ?? '') : '';
        $ok = fn($f) => preg_match('#^[A-Za-z0-9][A-Za-z0-9._/-]{0,120}\.(webp|png|jpe?g|gif)$#i', $f) && !str_contains($f, '..') && is_file("$dir/$f");
        if (!$ok($src)) continue;
        $shots[] = ['src' => "projects/$slug/$src", 'thumb' => $ok($thumb) ? "projects/$slug/$thumb" : "projects/$slug/$src",
                    'caption' => clean((string)(is_array($sh) ? ($sh['caption'] ?? '') : ''), 120)];
    }

    $out[] = [
        'slug' => $slug,
        'url' => "projects/$slug/index.html",
        'title' => clean((string)$title, 80),
        'tagline' => clean((string)($m['tagline'] ?? ''), 140),
        'description' => clean((string)($m['description'] ?? ''), 1200),
        'kind' => in_array($m['kind'] ?? '', $kinds, true) ? $m['kind'] : 'experiment',
        'status' => in_array($m['status'] ?? '', $statuses, true) ? $m['status'] : 'in_progress',
        'version' => clean((string)($m['version'] ?? ''), 20),
        'controls' => array_values(array_intersect((array)($m['controls'] ?? []), ['gamepad', 'keyboard', 'mouse', 'touch'])),
        'credit' => clean((string)($m['credit'] ?? ''), 240),
        'accent' => preg_match('/^#[0-9a-fA-F]{6}$/', (string)($m['accent'] ?? '')) ? $m['accent'] : '',
        'cover' => $cover,
        'order' => (int)($m['order'] ?? 100),
        'gamepad' => (object)$bridge,
        'gamepadLabels' => (object)$labels,
        'download' => $download,
        'screenshots' => $shots,
        'updated' => gmdate('c', $updated),
        'actions' => array_values(array_map(fn($a) => array_filter([
            'id' => clean((string)($a['id'] ?? $a['label'] ?? ''), 40), 'label' => clean((string)($a['label'] ?? $a['key']), 40),
            'key' => (string)$a['key'], 'pad' => in_array($a['pad'] ?? '', $btns, true) ? $a['pad'] : null,
        ], fn($v) => $v !== null), array_slice(array_values(array_filter((array)($m['actions'] ?? []), fn($a) => is_array($a) && is_string($a['key'] ?? null) && $a['key'] !== '' && mb_strlen($a['key']) <= 20)), 0, 24))),
        'controllerMode' => in_array($m['controllerMode'] ?? '', ['native', 'mapping'], true) ? $m['controllerMode'] : '',
    ];
}

usort($out, fn($a, $b) => [$a['order'], $b['updated']] <=> [$b['order'], $a['updated']]);
respond(['ok' => true, 'projects' => $out]);
