# Babel 2

## Requirements

1. PHP5.4 or newer
2. MongoDB
3. Composer

## Why?

1. Simpler and newer code.
2. Built-in validations. Translations and the original texts needs to have the same placeholders variables
3. UTF-8 by default
4. Easier to keep track of strings per client

## Setup

```bash
composer install
php cli.php user:create
php cli.php import:ios examples/io.strings
```
