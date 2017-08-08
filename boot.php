<?php

require __DIR__ . '/vendor/autoload.php';

$config = new ActiveMongo2\Configuration;
$config->addModelPath(__DIR__ . '/models');
$config->development();

$conn = new ActiveMongo2\Connection($config, new MongoClient, 'babel2');

