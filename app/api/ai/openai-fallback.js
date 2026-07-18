export class GoogleGenAI {
  constructor({ apiKey } = {}) {
    this.apiKey = apiKey;
  }
  
  get models() {
    return {
      generateContent: async ({ model, contents }) => {
        let messages = [];
        if (typeof contents === 'string') {
          messages = [{ role: 'user', content: contents }];
        } else if (Array.isArray(contents)) {
          messages = contents.map(c => {
            const role = c.role === 'model' ? 'assistant' : c.role;
            const text = c.parts?.map(p => p.text).join('\n') || '';
            return { role, content: text };
          });
        }
        
        const apiKeyToUse = process.env.OPENAI_API_KEY;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeyToUse}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.1,
          })
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI API error: ${errText}`);
        }
        
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        return {
          text: text
        };
      }
    };
  }
}
