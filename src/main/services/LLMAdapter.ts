import axios from 'axios';

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
    console.log(`Calling OpenAI-compatible provider: ${config.model} at ${config.baseURL}`);
    try {
      const payload: any = {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位资深的英语老师。请分析图片并提取其中的英文句子、对应的中文翻译以及简短的语法解析。请务必使用中文回答“chinese”和“grammar”部分。输出格式必须是一个 JSON 数组，包含 "english", "chinese", 和 "grammar" 三个键。示例: [{"english": "Hello", "chinese": "你好", "grammar": "常用的问候语"}]',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '分析这张图片并以指定的 JSON 数组格式输出结果，语法解析请使用中文：' },
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
      console.log('LLM Raw Content:', content);
      
      try {
        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : (parsed.results || parsed.data || parsed.items || []);
      } catch (e) {
        console.error('Failed to parse JSON from LLM content:', e);
        // Fallback: try to find anything that looks like a JSON array
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
        throw new Error('Response format was not valid JSON array');
      }
    } catch (error: any) {
      console.error('OpenAI Provider Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message || 'Unknown provider error');
    }
  }
}

export class DashScopeProvider extends LLMProvider {
  async analyzeImage(base64Image: string, config: LLMConfig): Promise<LLMResult[]> {
    console.log(`Calling DashScope: ${config.model}`);
    try {
      const response = await axios.post(
        config.baseURL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
          model: config.model,
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一位资深的英语老师。请分析图片并提取其中的英文句子、对应的中文翻译以及简短的语法解析。请务必使用中文回答“chinese”和“grammar”部分。输出格式必须是一个 JSON 数组，包含 "english", "chinese", 和 "grammar" 三个键。',
              },
              {
                role: 'user',
                content: [
                  { image: `data:image/jpeg;base64,${base64Image}` },
                  { text: '请分析这张图片，并以指定的 JSON 格式提供结果，语法解析请使用中文。' },
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
      
      console.log('DashScope Raw Content:', content);

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse DashScope response:', content);
        throw new Error('Failed to parse results from DashScope');
      }
    } catch (error: any) {
      console.error('DashScope Provider Error:', error.response?.data || error.message);
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
