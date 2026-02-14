<?php

use App\Http\Controllers\AiChatController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('chat', [AiChatController::class, 'index'])->name('chat');
Route::post('chat', [AiChatController::class, 'chat'])->name('chat.send');

require __DIR__ . '/settings.php';
