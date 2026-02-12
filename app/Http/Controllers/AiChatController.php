<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class AiChatController extends Controller
{
    public function index()
    {
        return Inertia::render('ai/chat/index');
    }

    public function chat(Request $request)
    {
        // $request->validate([
        //     'message' => 'required|string|max:1000',
        // ]);

        // $message = $request->input('message');

        // try {
        //     $response = Ai::chat($message);

        //     return response()->json([
        //         'success' => true,
        //         'response' => $response,
        //     ]);
        // } catch (\Exception $e) {
        //     return response()->json([
        //         'success' => false,
        //         'error' => $e->getMessage(),
        //     ], 500);
        // }
    }
}
