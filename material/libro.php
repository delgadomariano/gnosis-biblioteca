 
<?php
if (!empty($_GET['source'])) {
    $source = $_GET['source'];
}
if (!empty($_GET['name'])) {
    $name = $_GET['name'];
}
?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <title>Biblioteca Libros</title>
    <link rel="shortcut icon" href="https://igca.com.ar/biblioteca/favicon.ico" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
     <link rel="stylesheet" href="./style.css">
      
      
</head>

<body>

    <ul>
        <h3>
            <?php echo $name; ?>
        </h3>
    </ul>

    <iframe src="<?php echo $source; ?>" title="<?php echo $name; ?>"
    width="100%"
    height="100%"
    ></iframe>  
</body>

</html>