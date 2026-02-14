<?php

namespace App\Console\Commands;

use App\Ai\Agents\ChatBot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestOllamaConnection extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ollama:test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test Ollama connection and configuration';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Testing Ollama Connection...');
        $this->newLine();

        // Get configuration
        $provider = config('ai.default');
        $ollamaUrl = config('ai.providers.ollama.url');
        $model = config('ai.providers.ollama.model', env('OLLAMA_LLM_MODEL', 'qwen3-vl:8b'));

        $this->table(
            ['Configuration', 'Value'],
            [
                ['Default Provider', $provider],
                ['Ollama URL', $ollamaUrl],
                ['Model', $model],
            ]
        );

        $this->newLine();

        // Test 1: Check if Ollama is reachable
        $this->info('Test 1: Checking if Ollama is reachable...');
        try {
            $response = Http::timeout(5)->get($ollamaUrl . '/api/tags');

            if ($response->successful()) {
                $this->info('✓ Ollama is reachable!');
                $this->line('Status: ' . $response->status());

                $models = $response->json('models', []);
                if (!empty($models)) {
                    $this->info('Available models:');
                    foreach ($models as $modelInfo) {
                        $this->line('  - ' . ($modelInfo['name'] ?? 'Unknown'));
                    }
                }
            } else {
                $this->error('✗ Ollama responded with status: ' . $response->status());
                return 1;
            }
        } catch (\Throwable $e) {
            $this->error('✗ Failed to connect to Ollama');
            $this->error('Error: ' . $e->getMessage());
            $this->newLine();
            $this->warn('Make sure Ollama is running:');
            $this->line('  1. Check if Ollama is installed');
            $this->line('  2. Run: ollama serve');
            $this->line('  3. Verify it\'s accessible at: ' . $ollamaUrl);
            return 1;
        }

        $this->newLine();

        // Test 2: Check if the model exists
        $this->info('Test 2: Checking if model exists...');
        $modelExists = false;
        if (!empty($models)) {
            foreach ($models as $modelInfo) {
                if (
                    str_starts_with($modelInfo['name'] ?? '', $model) ||
                    str_starts_with($modelInfo['name'] ?? '', explode(':', $model)[0])
                ) {
                    $modelExists = true;
                    $this->info('✓ Model found: ' . ($modelInfo['name'] ?? 'Unknown'));
                    break;
                }
            }
        }

        if (!$modelExists) {
            $this->error('✗ Model "' . $model . '" not found');
            $this->newLine();
            $this->warn('To download the model, run:');
            $this->line('  ollama pull ' . $model);
            $this->newLine();
            $this->warn('Or try a smaller model:');
            $this->line('  ollama pull llama3.2:1b');
            $this->line('Then update your .env: OLLAMA_LLM_MODEL=llama3.2:1b');
            return 1;
        }

        $this->newLine();

        // Test 3: Try to generate a simple response
        $this->info('Test 3: Testing AI generation with ChatBot agent...');
        $this->warn('This may take a moment if the model needs to load...');

        try {
            $agent = ChatBot::make();

            // Use a very simple prompt to minimize processing time
            $response = $agent->prompt('Hi', model: $model);

            $this->info('✓ Successfully generated response!');
            $this->line('Response: ' . (string) $response);
        } catch (\Throwable $e) {
            $this->error('✗ Failed to generate response');
            $this->error('Error: ' . $e->getMessage());
            $this->newLine();

            if (str_contains($e->getMessage(), 'timed out')) {
                $this->warn('The request timed out. This could mean:');
                $this->line('  1. Model is too large/slow for this hardware');
                $this->line('  2. Ollama is overloaded or stuck');
                $this->line('  3. First run is loading the model (can be slow)');
                $this->newLine();
                $this->warn('Try these solutions:');
                $this->line('  1. Use a smaller model: ollama pull llama3.2:1b');
                $this->line('  2. Restart Ollama: killall ollama && ollama serve');
                $this->line('  3. Check Ollama logs for errors');
                $this->line('  4. Ensure your system has enough RAM');
            }

            return 1;
        }

        $this->newLine();
        $this->info('✓ All tests passed! Ollama is working correctly.');

        return 0;
    }
}
