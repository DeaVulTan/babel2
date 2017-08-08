<?php

/**
 *  @Persist("clients")
 *  @SingleCollection
 */
abstract class Client
{
    protected static $client;

    use ActiveMongo2\Query;

    /** @Id */
    public $id;

    /** @String @Unique */
    protected $name;

    /** @ReferenceMany(strings) */
    protected $strings = array();

    public function __construct()
    {
        $this->name = get_class($this);
    }

    public static function all()
    {
        return array(
            'Web' => 'Web Client',
            'Android' => 'Android', 
            'Desktop' => 'Destop', 
            'WindowsPhone' => 'Windows Phone', 
            'iOS' => 'iOS',
        );
    }

    public function prepareBulk()
    {
        $this->strings = array();
    }

    public function addText($text, $context)
    {
        $oText = Text::forTranslation($text, $context);
        $this->strings[] = $oText;
        return $oText;
    }

    public function getVariables($text)
    {
        preg_match_all("@(\[/?[a-z0-9_]{1,4}\])@i", $text, $matches);
        return $matches[0];
    }

    public static function set(self $client)
    {
        self::$client = self::findOne(array('name' => $client->name));
        if (empty(self::$client)) {
            self::$client = $client;
            self::$client->save();
        }
        return self::$client;
    }

    public static function get()
    {
        if (empty(self::$client)) {
            throw new RuntimeException("There is no default client");
        }
        return self::$client;
    }
}
