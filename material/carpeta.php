<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Obtener y sanitizar el ID de la carpeta
$folder_id = '';
if (!empty($_GET['id'])) {
    $folder_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id']);
} elseif (!empty($_GET['url'])) {
    if (preg_match('/folders\/([a-zA-Z0-9_-]+)/', $_GET['url'], $m)) {
        $folder_id = $m[1];
    } elseif (preg_match('/id=([a-zA-Z0-9_-]+)/', $_GET['url'], $m)) {
        $folder_id = $m[1];
    }
}

if (empty($folder_id)) {
    echo json_encode(['error' => 'No se proporcionó un ID de carpeta válido', 'items' => []]);
    exit;
}

$target_url = "https://drive.google.com/embeddedfolderview?id=" . $folder_id . "#list";

// Realizar la petición a Google Drive
$html = '';
if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $target_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    $html = curl_exec($ch);
    curl_close($ch);
}

if (empty($html)) {
    $options = [
        'http' => [
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n",
            'timeout' => 10
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    $context = stream_context_create($options);
    $html = @file_get_contents($target_url, false, $context);
}

if (empty($html)) {
    echo json_encode(['error' => 'No se pudo leer la carpeta de Google Drive', 'items' => []]);
    exit;
}

// Parsear entradas de archivos
$regex = '/<div class="flip-entry"[^>]*id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/';
preg_match_all($regex, $html, $matches, PREG_SET_ORDER);

$items = [];
foreach ($matches as $m) {
    $file_id = trim($m[1]);
    $file_name = html_entity_decode(trim($m[2]), ENT_QUOTES, 'UTF-8');
    
    $items[] = [
        'id' => $file_id,
        'name' => $file_name,
        'stream_url' => "https://docs.google.com/uc?export=download&id=" . $file_id,
        'preview_url' => "https://drive.google.com/file/d/" . $file_id . "/preview"
    ];
}

// Ordenar alfabéticamente por nombre de archivo
usort($items, function($a, $b) {
    return strnatcasecmp($a['name'], $b['name']);
});

echo json_encode([
    'folder_id' => $folder_id,
    'total' => count($items),
    'items' => $items
], JSON_UNESCAPED_UNICODE);
