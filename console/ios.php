<?php

function ios_translation($content)
{
    $strings    = array();
    $in_comment = false;
    $context     = "";
    foreach (explode("\n", $content) as $line) {
        if (strncmp(trim($line), "/*", 2) == 0) {
            $context = "";
            $in_comment = true;
        }
        if ($in_comment) {
            if (strpos($line, "*/")) {
                $in_comment = false;
            }
            $context .= trim($line, "*/ \r\n\t");
            continue;
        }

        if (strncmp(trim($line), "//", 2) == 0) {
            $context = ltrim($line, "/ ") . "\n";
            continue;
        }

        if (empty($line) || $line[0] != '"') {
            continue;
        }

        list($name, $english) = explode("=", $line, 2);

        for ($i=strlen($english)-1; $i >= 0 && $english[$i] != ';'; --$i);

        $english = substr($english, 0, $i);

        if (substr($english, -1) != '"') {
            throw new RuntimeException("CAN'T PARSE LINE: \n\n$line\n");
        }

        $name = trim(trim($name), ";\"\'");
        $english = trim(trim($english), ";\'\"*");

        $strings[$name] = array('context' => trim($context), 'text' => $english);
    }

    return $strings;
}

/**
 *  @Cli("import:ios")
 *  @Arg("path", REQUIRED)
 */
function ios_import($input)
{
    $file = $input->getArgument('path');
    if (!is_file($file)) {
        throw new \RuntimeException("$file is not a valid file");
    }
    $client = Client::set(new iOS);
    $client->prepareBulk();
    foreach (ios_translation(file_get_contents($file)) as $name => $string) {
        $client->addText($string['text'], $string['context']);
    }
    $client->save();
}
