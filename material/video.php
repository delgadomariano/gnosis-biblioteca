<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Biblioteca Videos</title>
    <link rel="shortcut icon" href="https://igca.com.ar/biblioteca/favicon.ico" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="description" content="Elite Video Player" />
    <link rel="stylesheet" href="./style.css">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/elite.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="css/elite-font-awesome.css" type="text/css">
    <link rel="stylesheet" href="css/jquery.mCustomScrollbar.css" type="text/css">
    
    <script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script src="js/froogaloop.js" type="text/javascript"></script>
    <script src="js/jquery.mCustomScrollbar.js" type="text/javascript"></script>
    <script src="js/THREEx.FullScreen.js"></script>
    <script src="js/videoPlayer.js" type="text/javascript"></script>
    <script src="js/Playlist.js" type="text/javascript"></script>

    <?php
    // 1. Sanitización de variables para evitar Inyección de Código (XSS)
    $source      = !empty($_GET['source']) ? htmlspecialchars($_GET['source'], ENT_QUOTES, 'UTF-8') : '';
    $name        = !empty($_GET['name']) ? htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8') : 'Video';
    $url_imagen  = !empty($_GET['url_imagen']) ? htmlspecialchars($_GET['url_imagen'], ENT_QUOTES, 'UTF-8') : '';
    
    // Detectar el tipo de video de forma dinámica (Por defecto: youtube)
    // Tipos soportados por Elite Player: "youtube", "vimeo", "HTML5" o "HLS"
    $video_type  = !empty($_GET['type']) ? htmlspecialchars($_GET['type'], ENT_QUOTES, 'UTF-8') : 'youtube';
    ?>

    <script type="text/javascript" charset="utf-8">
        $(document).ready(function($) {
            videoPlayer = $("#Elite_video_player").Video({ 
                instanceName: "player1", 
                instanceTheme: "dark", 
                autohideControls: 999999, 
                hideControlsOnMouseOut: "No", 
                playerLayout: "fitToBrowser", 
                videoPlayerWidth: 1000, 
                videoPlayerHeight: 610, 
                autoplay: false, 
                colorAccent: "#a2a5a7", 
                
                // --- MEJORAS DE PRIVACIDAD PARA YOUTUBE ---
                youtubeControls: "custom controls", // Usa los controles de tu web, no los de YT
                youtubeSkin: "dark", 
                youtubeColor: "white", 
                youtubeQuality: "default", 
                modestbranding: 1,  // Oculta el logo de YouTube en la barra de control
                iv_load_policy: 3,  // Oculta anotaciones y enlaces externos dentro del video
                rel: 0,             // Al pausar o terminar, solo muestra videos relacionados de TU propio canal
                // ------------------------------------------

                videoPlayerShadow: "effect3", 
                loadRandomVideoOnStart: "No", 
                shuffle: "No", 
                shareShow: "No",
                embedShow: "No",
                logoShow: "No", 
                posterImg: "", 
                nowPlayingText: "Yes", 
                fullscreen: "Fullscreen native", 
                rightClickMenu: false, // Bloquea el clic derecho para que no copien la URL fácilmente
                hideVideoSource: true, // Intenta ocultar las fuentes en reproductores HTML5
                popupImg: "images/preview_images/popup.jpg",
                popupAdShow: "no",
                
                playlist: "Right playlist",                    
                playlistScrollType: "light",                  
                playlistBehaviourOnPageload: "opened (default)",
                playlistBtnClosedTooltipTxt: "Mostrar lista", 
                playlistBtnOpenedTooltipTxt: "Ocultar lista", 
                
                videos: [
                    <?php
                    if (!empty($source)) {
                        $arr_source = preg_split("/\,/", $source);  
                        $i = 0;
                        foreach ($arr_source as $value) {
                            $i++;
                            // Limpieza del ID por seguridad
                            $value = trim($value); 
                            
                            echo "{\n";
                            echo "  videoType: \"" . $video_type . "\",\n";                            
                            echo "  title: \"" . $name . " - Parte " . $i . "\",\n";
                            
                            // Si es youtube usa youtubeID, si cambias a vimeo o HLS usará la propiedad correspondiente
                            if ($video_type === "youtube") {
                                echo "  youtubeID: \"" . $value . "\",\n";
                            } else if ($video_type === "vimeo") {
                                echo "  vimeoID: \"" . $value . "\",\n";
                            } else {
                                // Para Bunny.net o streaming propio (.mp4 o .m3u8)
                                echo "  videoUrl: \"" . $value . "\",\n";
                            }
                            
                            echo "  description: \"" . $name . " - Parte " . $i . "\",\n";
                            echo "  thumbImg: \"" . (!empty($url_imagen) ? "https://" . $url_imagen : "images/preview_images/default.jpg") . "\"\n";
                            echo "},\n";                                                
                        }
                    }
                    ?>
                ]
            });
        });
    </script>
    <style>
        /* Ocultar visualmente el título y desactivar por completo los clics en el video de YouTube */
        .elite_vp_videoPlayer iframe {
            pointer-events: none !important; /* Desactiva todos los clics directos al iframe de YouTube */
        }
        
        .elite_vp_videoPlayer::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 65px; /* Cubre la altura exacta del título de YouTube */
            z-index: 999999; /* Z-index máximo para asegurar que tape todo */
            background: #000000; /* Fondo negro para que no se vea el texto ni la URL */
            pointer-events: auto; /* Bloquea cualquier clic residual */
        }
        
        /* Hacer la barra de controles inferior totalmente opaca */
        .elite_vp_bg.elite_vp_dark {
            background: #000000 !important;
        }

        /* Ocultar botones de compartir y embeber */
        .elite_vp_shareBtn, .elite_vp_embedBtn {
            display: none !important;
        }
    </style>
</head> 
<body> 
    <div id="Elite_video_player"></div> 
</body>
</html>