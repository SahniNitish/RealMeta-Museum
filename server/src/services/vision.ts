import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { recognizeWithHuggingFace } from './huggingface-vision';

export interface VisionResult {
  title?: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  educationalNotes?: string;
  relatedWorks?: string;
  museumLinks?: string;
  confidence?: number;
}

function encodeImageToDataUrl(imageDiskPath: string): string {
  const absolutePath = path.isAbsolute(imageDiskPath)
    ? imageDiskPath
    : path.join(process.cwd(), imageDiskPath);
  const data = fs.readFileSync(absolutePath);
  const base64 = data.toString('base64');
  const ext = path.extname(absolutePath).toLowerCase().replace('.', '') || 'jpeg';
  return `data:image/${ext};base64,${base64}`;
}

// Mock AI recognition for testing (remove when you have OpenAI key)
function getMockAnalysis(imagePath: string): VisionResult {
  const filename = path.basename(imagePath).toLowerCase();
  
  // Detect image type based on filename or use generic responses
  if (filename.includes('car') || filename.includes('vehicle') || filename.includes('auto')) {
    return {
      title: "Mercedes-AMG GLE 63 S Coupe - Modern Automotive Design",
      author: "Mercedes-AMG Design Team (led by Gorden Wagener)",
      year: "2020-2023",
      style: "Contemporary Automotive Design",
      description: "This high-performance luxury SUV represents the pinnacle of modern automotive engineering and design philosophy. The vehicle showcases AMG's distinctive design language with its aggressive front fascia, aerodynamically sculpted body, and sophisticated proportions that balance performance aesthetics with luxury comfort. The coupe roofline demonstrates contemporary automotive trends toward sportier SUV silhouettes while maintaining Mercedes-Benz's commitment to premium materials and craftsmanship. This particular model reflects the evolution of automotive design from purely functional transportation to sophisticated industrial art objects.",
      educationalNotes: "This vehicle represents the intersection of automotive engineering and industrial design, showcasing how modern cars have become cultural symbols and design statements. The AMG division's approach to performance luxury demonstrates the contemporary trend of merging high-performance capability with everyday usability.",
      relatedWorks: "Similar design philosophies can be seen in BMW X6 M, Audi RSQ8, and Lamborghini Urus - all representing the modern luxury performance SUV category",
      museumLinks: "Visit the Mercedes-Benz Museum in Stuttgart, Germany, or the Petersen Automotive Museum in Los Angeles for more automotive design history",
      confidence: 0.85
    };
  } else if (filename.includes('paint') || filename.includes('art') || filename.includes('mona')) {
    return {
      title: "Portrait in Renaissance Style",
      author: "Unknown Renaissance Master (15th-16th Century)",
      year: "c. 1480-1520",
      style: "High Renaissance Portraiture",
      description: "This portrait exemplifies the sophisticated artistic achievements of the Renaissance period, demonstrating masterful use of sfumato technique and psychological depth characteristic of the era's greatest practitioners. The work shows careful attention to anatomical accuracy, subtle modeling of light and shadow, and the period's revolutionary approach to capturing human psychology through artistic expression. The composition reflects the Renaissance ideal of balancing naturalistic representation with classical principles of harmony and proportion. The painting technique suggests training in the Florentine or Venetian schools, where artists pioneered oil painting methods that allowed for unprecedented detail and luminosity.",
      educationalNotes: "Renaissance portraiture marked a revolutionary shift in art history, moving from medieval symbolic representation to naturalistic human observation. Artists of this period, including Leonardo da Vinci and Raphael, developed techniques like sfumato and chiaroscuro that continue to influence artists today.",
      relatedWorks: "Compare with Leonardo da Vinci's 'Mona Lisa', Raphael's 'Portrait of Baldassare Castiglione', and Sandro Botticelli's portraits",
      museumLinks: "Explore the Uffizi Gallery in Florence, the Louvre in Paris, or the Metropolitan Museum of Art's European Paintings collection",
      confidence: 0.78
    };
  } else if (filename.includes('building') || filename.includes('architecture')) {
    return {
      title: "Gothic Cathedral Architecture",
      author: "Medieval Master Builders and Stone Masons",
      year: "12th-13th Century",
      style: "High Gothic Architecture",
      description: "This magnificent example of Gothic architecture represents one of humanity's greatest architectural achievements, showcasing the revolutionary engineering innovations that allowed medieval builders to create structures of unprecedented height and luminosity. The characteristic pointed arches, ribbed vaulting, and flying buttresses not only solved complex structural problems but also created a new aesthetic language that emphasized verticality and divine aspiration. The intricate stone tracery and vast windows demonstrate the period's mastery of both engineering and decorative arts. These cathedrals served as centers of community life, repositories of knowledge, and expressions of medieval Christian cosmology, representing the culmination of centuries of architectural evolution.",
      educationalNotes: "Gothic architecture revolutionized building techniques, introducing innovations like the pointed arch and flying buttress that distributed weight more efficiently than previous Romanesque styles. These buildings were engineering marvels that required sophisticated mathematical understanding and represented the collaborative efforts of entire communities over generations.",
      relatedWorks: "Compare with Notre-Dame de Paris, Chartres Cathedral, and Cologne Cathedral - all exemplars of Gothic architectural principles",
      museumLinks: "Visit the Centre des Monuments Nationaux (France) or explore architectural history at the Victoria and Albert Museum in London",
      confidence: 0.82
    };
  } else {
    // Generic analysis for any uploaded image
    return {
      title: "Contemporary Visual Art or Cultural Artifact",
      author: "Contemporary Creator or Artist",
      year: "Late 20th - 21st Century",
      style: "Contemporary Art/Photography",
      description: "This image represents contemporary visual culture, displaying characteristics typical of modern artistic expression or documentation. The composition demonstrates awareness of visual design principles including balance, color theory, and compositional structure that reflect current aesthetic sensibilities. Whether created as fine art, commercial photography, or cultural documentation, the work embodies the democratic nature of contemporary image-making where traditional boundaries between high and popular culture continue to blur. The piece reflects our current digital age where images serve multiple functions as artistic expression, social communication, and cultural record.",
      educationalNotes: "Contemporary visual culture encompasses a vast range of media and approaches, from traditional fine arts to digital creation and social media expression. This democratization of image-making reflects broader cultural shifts in how we create, share, and interpret visual information.",
      relatedWorks: "Context within contemporary photography movements, digital art practices, and current cultural documentation trends",
      museumLinks: "Explore contemporary art at MoMA (New York), Tate Modern (London), or local contemporary art centers",
      confidence: 0.70
    };
  }
}

export async function recognizeArtworkFromImage(imageDiskPath: string): Promise<VisionResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const useGoogleVision = process.env.USE_GOOGLE_VISION === 'true';
  const useTensorFlow = process.env.USE_TENSORFLOW === 'true';
  const huggingFaceKey = process.env.HUGGINGFACE_API_KEY;

  // Priority: Claude (best for artwork) > OpenAI > Hugging Face (generic) > Mock (fallback)

  // Try Claude first if available - excellent for recognizing artworks
  if (anthropicKey) {
    console.log('🔍 Using Claude Vision for artwork recognition...');
    const client = new Anthropic({ apiKey: anthropicKey });

    try {
      // Read image and convert to base64
      const imageData = fs.readFileSync(imageDiskPath);
      const base64Image = imageData.toString('base64');
      const ext = path.extname(imageDiskPath).toLowerCase().replace('.', '');
      const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      const response = await client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `You are a world-class museum curator and art historian with expertise in all forms of art, culture, and historical artifacts. Analyze this image with the highest level of scholarly detail and provide comprehensive educational content suitable for a museum setting.

ANALYSIS REQUIREMENTS:

For ARTWORKS (paintings, sculptures, decorative arts, etc.):
- Identify the specific artwork if recognizable (title, artist, creation date, current location/museum)
- Analyze artistic style, period, movement, and technique
- Describe visual elements: composition, color palette, brushwork, materials
- Provide historical context: cultural significance, patron, commissioned purpose
- Include educational insights: what visitors should know and appreciate
- Mention similar works or related artists for context

For CULTURAL ARTIFACTS & HISTORICAL OBJECTS:
- Identify the object type, origin, and historical period
- Describe craftsmanship, materials, and cultural significance
- Explain the object's purpose, use, and social context
- Provide cultural and historical background
- Connect to broader historical narratives

For ARCHITECTURE & MONUMENTS:
- Identify the structure, architect/builder, and construction period
- Analyze architectural style, features, and innovations
- Describe cultural and historical significance
- Explain the building's purpose and social importance

For MODERN OBJECTS (cars, technology, etc.):
- Identify the specific item, manufacturer, and era
- Describe design features, technological innovations
- Provide historical and cultural context
- Explain significance in design/technological history

RESPONSE FORMAT:
Return a comprehensive JSON response with these keys:
{
  "title": "full artwork/object name with any subtitle",
  "author": "artist/creator/manufacturer with birth-death dates if known",
  "year": "creation date or era (be specific when possible)",
  "style": "artistic style/period/movement/category",
  "description": "detailed 4-5 sentence museum-quality description with visual analysis, historical context, and cultural significance",
  "educationalNotes": "2-3 sentences of educational insights - what makes this significant, interesting techniques, historical importance, or cultural impact",
  "relatedWorks": "mention 2-3 similar works, artists, or related pieces for context",
  "museumLinks": "suggest relevant museum websites or educational resources where visitors could learn more",
  "confidence": 0.0-1.0
}

QUALITY STANDARDS:
- Write as if creating a museum label or exhibition text
- Use scholarly but accessible language
- Include specific art historical terminology when appropriate
- Provide educational value that enriches visitor understanding
- If uncertain about specific identification, focus on style, period, and general category with educational context
- Always aim to educate and inspire curiosity about the artwork or object

Remember: You are creating content for a museum experience. Every response should be educational, accurate, and designed to enhance visitor appreciation and understanding.`
            }
          ]
        }]
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (textContent && 'text' in textContent) {
        const text = textContent.text;
        console.log('🤖 Claude Vision response:', text);

        // Try to parse JSON from response
        try {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const json = text.slice(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(json);
            console.log('✅ Parsed Claude result:', parsed);
            return parsed as VisionResult;
          }
        } catch (parseError) {
          console.log('⚠️ JSON parse failed, using text response');
        }

        // If JSON parsing fails, return text as description
        return {
          title: 'AI Analysis',
          description: text,
          educationalNotes: 'This analysis was generated by AI. For more detailed information, consult museum resources.',
          relatedWorks: 'Related works can be found through museum collections and art databases.',
          museumLinks: 'Visit museum websites or contact local institutions for more information.',
          confidence: 0.5
        } as VisionResult;
      }
    } catch (error: any) {
      console.error('❌ Claude Vision API error:', error);
      console.log('⚠️ Falling back to OpenAI...');
      // Fall through to try OpenAI
    }
  }

  // Use OpenAI as fallback if available
  if (openaiKey) {
    console.log('🔍 Using OpenAI Vision for artwork recognition...');
    const client = new OpenAI({ apiKey: openaiKey });
    const imageUrl = encodeImageToDataUrl(imageDiskPath);

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a world-class museum curator and art historian with expertise in all forms of art, culture, and historical artifacts. Analyze this image with the highest level of scholarly detail and provide comprehensive educational content suitable for a museum setting.

ANALYSIS REQUIREMENTS:

For ARTWORKS (paintings, sculptures, decorative arts, etc.):
- Identify the specific artwork if recognizable (title, artist, creation date, current location/museum)
- Analyze artistic style, period, movement, and technique
- Describe visual elements: composition, color palette, brushwork, materials
- Provide historical context: cultural significance, patron, commissioned purpose
- Include educational insights: what visitors should know and appreciate
- Mention similar works or related artists for context

For CULTURAL ARTIFACTS & HISTORICAL OBJECTS:
- Identify the object type, origin, and historical period
- Describe craftsmanship, materials, and cultural significance
- Explain the object's purpose, use, and social context
- Provide cultural and historical background
- Connect to broader historical narratives

For ARCHITECTURE & MONUMENTS:
- Identify the structure, architect/builder, and construction period
- Analyze architectural style, features, and innovations
- Describe cultural and historical significance
- Explain the building's purpose and social importance

For MODERN OBJECTS (cars, technology, etc.):
- Identify the specific item, manufacturer, and era
- Describe design features, technological innovations
- Provide historical and cultural context
- Explain significance in design/technological history

RESPONSE FORMAT:
Return a comprehensive JSON response with these keys:
{
  "title": "full artwork/object name with any subtitle",
  "author": "artist/creator/manufacturer with birth-death dates if known",
  "year": "creation date or era (be specific when possible)",
  "style": "artistic style/period/movement/category",
  "description": "detailed 4-5 sentence museum-quality description with visual analysis, historical context, and cultural significance",
  "educationalNotes": "2-3 sentences of educational insights - what makes this significant, interesting techniques, historical importance, or cultural impact",
  "relatedWorks": "mention 2-3 similar works, artists, or related pieces for context",
  "museumLinks": "suggest relevant museum websites or educational resources where visitors could learn more",
  "confidence": 0.0-1.0
}

QUALITY STANDARDS:
- Write as if creating a museum label or exhibition text
- Use scholarly but accessible language
- Include specific art historical terminology when appropriate
- Provide educational value that enriches visitor understanding
- If uncertain about specific identification, focus on style, period, and general category with educational context
- Always aim to educate and inspire curiosity about the artwork or object

Remember: You are creating content for a museum experience. Every response should be educational, accurate, and designed to enhance visitor appreciation and understanding.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const text = response.choices[0]?.message?.content || '';
      console.log('🤖 OpenAI Vision response:', text);

      // Try to parse JSON from response
      try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = text.slice(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(json);
          console.log('✅ Parsed AI result:', parsed);
          return parsed as VisionResult;
        }
      } catch (parseError) {
        console.log('⚠️ JSON parse failed, using text response');
      }

      // If JSON parsing fails, return text as description
      return {
        title: 'AI Analysis',
        description: text,
        educationalNotes: 'This analysis was generated by AI. For more detailed information, consult museum resources.',
        relatedWorks: 'Related works can be found through museum collections and art databases.',
        museumLinks: 'Visit museum websites or contact local institutions for more information.',
        confidence: 0.5
      } as VisionResult;

    } catch (error) {
      console.error('❌ OpenAI Vision API error:', error);
      console.log('⚠️ Falling back to Hugging Face...');
      // Fall through to try Hugging Face
    }
  }

  // Try Hugging Face as fallback (generic captions only)
  if (huggingFaceKey) {
    console.log('🤖 Using Hugging Face Vision (generic captions)...');
    try {
      const hfResult = await recognizeWithHuggingFace(imageDiskPath);
      return {
        title: hfResult.title || 'Unknown',
        author: hfResult.author || 'Unknown',
        year: hfResult.year || 'Unknown',
        style: hfResult.style || 'Unknown',
        description: hfResult.description || 'No description available',
        confidence: hfResult.confidence || 0.0
      };
    } catch (error) {
      console.error('❌ Hugging Face failed, falling back to local processing:', error);
      // Fall through to local processing
    }
  }
  
  // Use mock analysis as last resort
  console.log('🎭 Using Mock AI Analysis (no API keys available)');
  return getMockAnalysis(imageDiskPath);
}


