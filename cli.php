<?php

require __DIR__ . '/boot.php';

$cli = new crodas\cli\Cli;
$cli->addDirectory(__DIR__ . '/console');
$cli->main();
