<?php

require_once __DIR__.'/../boot.php'; 

$filename = __DIR__.preg_replace('#(\?.*)$#', '', $_SERVER['REQUEST_URI']);
if (php_sapi_name() === 'cli-server' && is_file($filename)) {
    return false;
}

$app = new Silex\Application(); 
$app->register(new Silex\Provider\SessionServiceProvider());
$app['db'] = $conn;
$app['debug'] = true;

$app->before(function($request, $app) {
    if ($request->getRequestUri() !== '/login' && null === $app['user']) {
        $app['session']->set('next', $request->getRequestUri());
        return $app->redirect('/login');
    }
});

$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/../templates',
));

$app->post('/strings/add', function() use ($app) {
    $clients = Client::all();
    $user = $app['user'];
    $batch = false;
    $bulk  = false;

    try {
        if (empty($clients[$_POST['section']])) {
            throw new \Exception("Invalid section");
        }
        $text = Client::set(new $_POST['section'])->addText($_POST['text'], $_POST['description']);
        $text->save();
        $id = $text->id;
        return $app['twig']->render('add.html', compact('user', 'batch', 'bulk', 'clients', 'id'));
    } catch (\Exception $e) {
        $error = $e->getMessage();
        return $app['twig']->render('add.html', compact('user', 'batch', 'bulk', 'clients', 'error'));
    }
});

$app->get('/strings/add', function() use ($app) {
    $user = $app['user'];
    $batch = false;
    $bulk  = false;
    $clients = Client::all();
    return $app['twig']->render('add.html', compact('user', 'batch', 'bulk', 'clients'));
});

$app->post('/login', function() use ($app) {
    $user = User::findOne(array('email' => $_POST['username']));
    if (empty($user) || !password_verify($_POST['password'], $user->password)) {
        return $app['twig']->render('login.html', array('error' => 'Invalid email or password'));
    }
    $app['session']->set('user', $user->id);
    $path = $app['session']->get('next');
    if (empty($path) || $path[0] !== '/') {
        $path = '/';
    }
    return $app->redirect($path);
});

$app->get('/logout', function() use ($app) {
    $app['session']->set('user', null);
    return $app->redirect('/');
});

$app['user'] = function() use ($app) {
    $userid = $app['session']->get('user');
    if (!empty($userid)) {
        return User::findOne(['_id' => $userid]);
    }

    return null;
};

$app->get('/', function() use ($app) {
    $user = $app['user'];
    return $app['twig']->render('layout.html', compact('user'));
});

$app->get('/login', function() use ($app) {
    return $app['twig']->render('login.html');
});

$app->get('/hello/{name}', function($name) use($app) { 
    return 'Hello '. $app->escape($name); 
}); 

$app->run(); 
