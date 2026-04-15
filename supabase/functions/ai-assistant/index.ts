import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('AI not configured');

    const { messages } = await req.json();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are the AI assistant for Rees Daycare Nursery & Primary School in Mbale City, Uganda. Phone: +256780306692.

The school offers: Baby Class, Middle Class, Top Class, KG1-KG3 (Kindergarten), and Primary 1-7.

Nursery subjects: Oral Work, Writing, Number Work, Creative Activities, Environmental Activities, Religious Education.
Primary subjects (Uganda new curriculum): Literacy, Numeracy, Social Studies, Science, Creative Arts, Physical Education, Local Language, English.

Grading: Competency-based (BE=Beyond Expectation 80-100, AE=Above Expectation 65-79, ME=Meeting Expectation 50-64, BW=Below Expectation 0-49) combined with numeric scores.

Terms: Term 1 (Feb-May), Term 2 (May-Aug), Term 3 (Sep-Dec).

Be helpful, concise, and friendly. Answer questions about admissions, fees, curriculum, school policies, and general inquiries. If you don't know something specific, suggest contacting the school directly.`
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Too many requests, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
