<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use VHCO\Fixture\Greeting;

final class GreetingTest extends TestCase
{
    public function testMessage(): void
    {
        self::assertSame('Hello world', Greeting::message('world'));
    }
}
