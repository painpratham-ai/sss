import { NextResponse } from 'next/server';
import { callModel } from '@/lib/models';
import { db } from '@/lib/db';
import { retrieve } from '@/lib/knowledge';

export async function POST(request: Request) {
  try {
    const { imageBase64, questionId, questionText, board, subject } = await request.json();

    if (!imageBase64 || !questionText) {
      return NextResponse.json(
        { error: 'Missing required parameters: imageBase64 or questionText' },
        { status: 400 }
      );
    }

    // 1. Retrieve the official marking scheme for this question
    const markingSchemeQuery = `marking scheme answer key for ${questionText}`;
    const chunks = await retrieve(markingSchemeQuery, { board, subject, topK: 3 });
    const markingSchemeContext = chunks.map(c => c.content).join('\n\n');

    const prompt = `
      You are an expert ${board} examiner for ${subject}. 
      Evaluate the student's handwritten answer in the provided image.
      
      Question:
      "${questionText}"

      Official Marking Scheme & Knowledge Context:
      """
      ${markingSchemeContext}
      """

      Provide your evaluation in the following JSON format:
      {
        "transcription": "What the student wrote",
        "marksAwarded": 2,
        "maxMarks": 5,
        "stepWiseFeedback": [
           {"step": "Formula definition", "awarded": true, "comment": "Correct formula used."},
           {"step": "Calculation", "awarded": false, "comment": "Error in step 2. Missed keyword X."}
        ],
        "generalFeedback": "Good attempt but you need to mention..."
      }
      
      Ensure strict adherence to the marking scheme. Look for specific keywords.
    `;

    // 2. Evaluate using the centralized multi-model router
    const { content } = await callModel({
      preferredModel: 'auto',
      question: prompt,
      hasImage: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ]
    });

    // Parse the JSON output from the model
    let evaluation;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
      if (jsonMatch) {
         evaluation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
         throw new Error("Failed to parse JSON");
      }
    } catch (e) {
      // Fallback
      evaluation = {
         transcription: "Failed to read perfectly.",
         marksAwarded: 0,
         maxMarks: 5,
         stepWiseFeedback: [],
         generalFeedback: content
      };
    }

    return NextResponse.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Error evaluating mock exam:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
