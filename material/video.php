 
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
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

    <script type="text/javascript" charset="utf-8">
        $(document).ready(function($) {
            videoPlayer = $("#Elite_video_player").Video({ //ALL PLUGIN OPTIONS
                instanceName: "player1", //name of the player instance
                instanceTheme: "dark", //dark or light
                autohideControls: 2, //autohide HTML5 player controls
                hideControlsOnMouseOut: "Yes", //hide HTML5 player controls on mouse out of the player: "Yes","No"
                playerLayout: "fixedSize", //Select player layout: "fitToContainer", "fixedSize", "fitToBrowser"
                videoPlayerWidth: 1000, //fixed total player width
                videoPlayerHeight: 610, //fixed total player height
                autoplay: false, //autoplay when webpage loads: true/false
                colorAccent: "#a2a5a7", //plugin colors accent (hexadecimal value - http://www.colorpicker.com/)
                youtubeControls: "custom controls", //choose youtube player controls: "custom controls", "default controls"
                youtubeSkin: "dark", //youtube theme: light,dark
                youtubeColor: "red", //youtube color: red, white
                youtubeQuality: "default", //choose youtube quality: "small", "medium", "large", "hd720", "hd1080", "highres", "default"
                videoPlayerShadow: "effect3", //choose player shadow:  "effect1" , "effect2", "effect3", "effect4", "effect5", "effect6", "off"
                loadRandomVideoOnStart: "No", //choose to load random video when webpage loads: "Yes", "No"
                shuffle: "No", //choose to shuffle videos when playing one after another: "Yes", "No" (shuffle button enabled/disabled on start)
                logoShow: "No", //"Yes","No"
                posterImg: "", //player poster image 
                nowPlayingText: "Yes", //enable disable now playing title: "Yes","No"
                fullscreen: "Fullscreen native", //choose fullscreen type: "Fullscreen native","Fullscreen browser"
                rightClickMenu: false, //enable/disable right click over player: true/false
                hideVideoSource: true, //option to hide self hosted video sources (to prevent users from download/steal your videos): true/false
                showAllControls: true, //enable/disable all HTML5 player controls: true/false
                popupImg: "images/preview_images/popup.jpg",
                popupAdShow: "no",
                //
                playlist:"Right playlist",                   //choose playlist type: "Right playlist", "Bottom playlist", "Off"
                playlistScrollType:"light",                  //choose scrollbar type: "light","minimal","light-2","light-3","light-thick","light-thin","inset","inset-2","inset-3","rounded","rounded-dots","3d","dark","minimal-dark","dark-2","dark-3","dark-thick","dark-thin","inset-dark","inset-2-dark","inset-3-dark","rounded-dark","rounded-dots-dark","3d-dark","3d-thick-dark"
                playlistBehaviourOnPageload:"opened (default)",//choose playlist behaviour when webpage loads: "closed", "opened (default)" (not apply to Vimeo player)
                playlistBtnClosedTooltipTxt:"Show playlist", //translate "Show playlist" to your language
                playlistBtnOpenedTooltipTxt:"Hide playlist", //translate "Exit fullscreen" to your language
                //manual playlist
                <?php
                if (!empty($_GET['source'])) {
                    $source = $_GET['source'];
                }
                if (!empty($_GET['name'])) {
                    $name = $_GET['name'];
                }
                if (!empty($_GET['url_imagen'])) {
                    $url_imagen = $_GET['url_imagen'];
                }
                ?>
                 videos: [
                    <?php
                    $arr_source = preg_split ("/\,/", $source);  
                    $i = 0;
                    foreach ($arr_source as $value) {
                        $i++;
                        echo "{  ";
                        echo "videoType: \"youtube\",  ";                            
                        echo "title: \"$name . $i\",  ";
                        echo "youtubeID: \"$value\", ";
                        echo "description: \"$name . $i\",  ";
                        echo "thumbImg: \"https://$url_imagen\"  ";
                        echo "},  ";
                                                
                      }
                    ?>
                    
                ]

            });
        });
    </script>
</head> 
<body> 
    <div id="Elite_video_player"></div> 
</body>

</html>