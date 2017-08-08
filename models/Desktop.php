<?php

/**
 *  @Persist
 */
class Desktop extends Client
{
    public function getVariables($text)
    {
        $vars = parent::getVariables($text);
        preg_match_all("@%\d+@", $text, $matches);
        return array_merge($vars, $matches[0]);
    }
}
