import axios from 'axios';
import { ANKI_PROMPTS } from '../config/prompts';
import log from 'electron-log';

export interface LLMResult {
  english: string;
  chinese: string;
  grammar: string;
}

export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
}

export abstract class LLMProvider {
  abstract analyzeImage(base64Image: string, config: LLMConfig): Promise<LLMResult[]>;
}

export class OpenAIProvider extends LLMProvider {
  async analyzeImage(base64Image: string, config: LLMConfig): Promise<LLMResult[]> {
    log.info(`Calling OpenAI-compatible provider: ${config.model} at ${config.baseURL}`);
    try {
      const payload: any = {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: ANKI_PROMPTS.SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: ANKI_PROMPTS.USER_PROMPT_PREFIX },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      };

      // Specific check for models that might be called through OpenAI provider but use different formats
      // DeepSeek (api.deepseek.com) currently does NOT support vision.
      if (config.baseURL?.includes('deepseek.com') || config.model.toLowerCase().includes('deepseek')) {
        throw new Error('The selected DeepSeek model does not support image analysis. Please use OpenAI (GPT-4o) or DashScope (Qwen-VL).');
      }

      // Only add response_format if it's explicitly OpenAI and a supporting model
      if (config.model.includes('gpt-4o') || config.model.includes('gpt-4-turbo')) {
        payload.response_format = { type: 'json_object' };
      }

      const response = await axios.post(
        config.baseURL || 'https://api.openai.com/v1/chat/completions',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30s timeout
        }
      );

      const content = response.data.choices[0].message.content;
      log.info('LLM Raw Content:', content);
      
      try {
        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : (parsed.results || parsed.data || parsed.items || []);
      } catch (e) {
        log.error('Failed to parse JSON from LLM content:', e);
        // Fallback: try to find anything that looks like a JSON array
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
        throw new Error('Response format was not valid JSON array');
      }
    } catch (error: any) {
      log.error('OpenAI Provider Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message || 'Unknown provider error');
    }
  }
}

export class DashScopeProvider extends LLMProvider {
  async analyzeImage(base64Image: string, config: LLMConfig): Promise<LLMResult[]> {
    log.info(`Calling DashScope: ${config.model}`);
    try {
      const response = await axios.post(
        config.baseURL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
          model: config.model,
          input: {
            messages: [
              {
                role: 'system',
                content: ANKI_PROMPTS.SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: [
                  { image: `data:image/jpeg;base64,${base64Image}` },
                  { text: ANKI_PROMPTS.USER_PROMPT_PREFIX },
                ],
              },
            ],
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable',
          },
          timeout: 30000,
        }
      );

      // DashScope response structure for qwen-vl
      const content = response.data.output?.choices?.[0]?.message?.content?.[0]?.text || 
                      response.data.output?.text || 
                      '';
      
      log.info('DashScope Raw Content:', content);

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        return JSON.parse(jsonStr);
      } catch (e) {
        log.error('Failed to parse DashScope response:', content);
        throw new Error('Failed to parse results from DashScope');
      }
    } catch (error: any) {
      log.error('DashScope Provider Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'DashScope error');
    }
  }
}

export class LLMAdapter {
  private providers: Record<string, LLMProvider> = {
    openai: new OpenAIProvider(),
    dashscope: new DashScopeProvider(),
    deepseek: new OpenAIProvider(), // DeepSeek uses OpenAI format
  };

  async analyze(providerType: string, base64Image: string, config: LLMConfig): Promise<LLMResult[]> {
    const provider = this.providers[providerType.toLowerCase()];
    if (!provider) {
      throw new Error(`Unsupported provider: ${providerType}`);
    }
    return provider.analyzeImage(base64Image, config);
  }
}
