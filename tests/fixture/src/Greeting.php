<?php

declare(strict_types=1);

namespace VHCO\Fixture;

final class Greeting
{
    public static function message(string $name): string
    {
        return 'Hello ' . $name;
    }
}
