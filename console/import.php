<?php

/**
 *  @Cli("import", "Import from MySQL")
 *  @Arg("mysql", REQUIRED)
 */
function import($input, $output)
{
    $parts = parse_url($input->getArgument('mysql'));
    $parts['path'] = trim($parts['path'], '/');
    if (empty($parts['pass'])) {
        $parts['pass'] = '';
    }
    $pdo = new PDO("{$parts['scheme']}:dbname={$parts['path']}", $parts['user'], $parts['pass']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);


    $rows = iterator_to_array($pdo->query("SELECT *, s.id as stringid FROM strings s INNER JOIN sections c ON (c.id = s.sectionid)"));
    $pdo->query("SET character_set_client = 'latin1'");
    $pdo->query("set character_set_connection = 'latin1'");
    $pdo->query("SET character_set_database = 'latin1'");
    $pdo->query("SET character_set_filesystem = 'binary'");
    $pdo->query("set character_set_results = 'latin1'");
    $pdo->query("set character_set_results = 'latin1'");

    $xrows = $pdo->query("SELECT * FROM languages");
    foreach ($xrows as $row) {
        $lang = Language::findOrCreateBy(array('code' => $row['code']));
        $lang->name = $row['nativename'] ?: $row['name'];
        $lang->englishName = $row['name'];
        $lang->save();
    }

    $maxId = 0;
    foreach ($rows as $row) {
        if (preg_match("/android/i", $row['name'])) {
            Client::set(new Android);
        } else if (preg_match("/ios/i", $row['name'])) {
            Client::set(new iOS);
        } else if (preg_match("/windows/i", $row['name'])) {
            Client::set(new WindowsPhone);
        } else if (preg_match("/sync/i", $row['name'])) {
            Client::set(new Desktop);
        } else if (preg_match("/web/i", $row['name'])) {
            Client::set(new Web);
        } else {
            echo "Skip " . $row['name'] . "\n";
            continue;
        }
        $trans = $pdo->query("select t.stringid, t.text, l.code as lang from tstrings t inner join languages l on (l.id = t.langid) where t.stringid = " . $row['stringid']);
        $text  = Text::forTranslation($row['text'], $row['description']);
        $curId = (int)$row['stringid'];
        $maxId = $curId < $maxId ? $maxId : $curId;
        if ($text->id === null) {
            $text->id = $curId;
        }
        foreach ($trans as $r) {
            try {
                $text->addTranslation($r['lang'], $r['text']);
            } catch (\Exception $e) {
                //echo (string)$e . "\n";
            }
        }
        $text->save();
    }

    $incr = $GLOBALS['conn']->getCollection('_autoincrement');
    $incr->rawCollection()->update(
        array('_id' => 'strings'),
        array('$set' => array('lastId' => $maxId))
    );
    

}
