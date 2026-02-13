import type { TestCategory } from '../../../shared/types';

export const TEST_CATEGORIES: TestCategory[] = [
  // ================================================================
  // AGGREGATION
  // ================================================================
  {
    id: 'aggregation',
    name: 'Aggregation',
    description: 'Summarization, data extraction, and key point identification',
    icon: 'layers',
    scenarios: [
      {
        id: 'agg-summarize',
        categoryId: 'aggregation',
        name: 'News Article Summarization',
        description: 'Summarize an article into concise bullet points',
        prompt: `Summarize the following news article in exactly {{bullet_count}} bullet points, each no longer than {{word_limit}} words. Focus on the key facts, not opinions.

{{article_text}}`,
        systemPrompt: 'You are a precise summarization assistant. Be factual and concise.',
        expectedBehavior: 'Exactly N bullet points, each under the word limit, covering the most important facts from the article.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1, description: 'Lower = more focused' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 200, min: 50, max: 500, step: 50, description: 'Maximum response length' },
          { key: 'bullet_count', label: 'Bullet Count', type: 'number', default: 3, min: 1, max: 10, step: 1, description: 'Number of bullet points' },
          { key: 'word_limit', label: 'Word Limit per Bullet', type: 'number', default: 25, min: 10, max: 50, step: 5, description: 'Max words per bullet point' },
          {
            key: 'article_text', label: 'Article Text', type: 'textarea',
            default: `Tech giant Meridian Corp announced today that it will acquire CloudScale, a leading cloud infrastructure startup, for $4.2 billion in an all-cash deal. The acquisition, expected to close in Q3 2025, will bring CloudScale's 2,000 employees under Meridian's enterprise division. CEO Sarah Chen stated that the move positions Meridian to compete directly with major cloud providers. CloudScale, founded in 2019 by former Google engineers, has grown rapidly with $800 million in annual recurring revenue. Industry analysts note this is the largest cloud infrastructure acquisition this year. Some existing CloudScale customers have expressed concern about potential pricing changes under new ownership. Meridian's stock rose 3.2% on the news, while competitor shares declined slightly. The deal requires regulatory approval from the FTC, which has increased scrutiny of tech mergers. CloudScale's co-founder and CTO James Park will join Meridian's leadership team as SVP of Cloud Engineering.`,
            description: 'The article to summarize',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'agg-sum-format', name: 'Format Compliance', weight: 25, description: 'Correct number of bullet points, each under word limit', scoringMethod: 'algorithmic', algorithmicCheck: 'bullet_count_and_length', scale: { min: 0, max: 5 } },
            { id: 'agg-sum-coverage', name: 'Coverage', weight: 35, description: 'Bullets capture the most important facts from the source', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'agg-sum-concise', name: 'Conciseness', weight: 20, description: 'Bullets are concise and avoid unnecessary filler', scoringMethod: 'algorithmic', algorithmicCheck: 'avg_word_count', scale: { min: 0, max: 5 } },
            { id: 'agg-sum-accuracy', name: 'Factual Accuracy', weight: 20, description: 'Bullet points are factually consistent with the source text', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['summarization', 'conciseness', 'factual'],
      },
      {
        id: 'agg-extract',
        categoryId: 'aggregation',
        name: 'Data Extraction',
        description: 'Extract structured JSON from unstructured text',
        prompt: `Extract the following fields from this text and return them as a JSON object with these exact keys: {{fields}}. If a field is not found, set its value to null.

{{text_input}}`,
        systemPrompt: 'You are a data extraction assistant. Return only valid JSON, no additional text.',
        expectedBehavior: 'Valid JSON with all requested keys, correct values extracted from text, null for missing fields.',
        referenceAnswer: '{"person_name": "Sarah Chen", "company": "Meridian Corp", "role": "CEO", "date": "Q3 2025", "dollar_amount": "$4.2 billion"}',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0, min: 0, max: 1, step: 0.1, description: 'Lower = more deterministic' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 200, min: 100, max: 500, step: 50, description: 'Maximum response length' },
          { key: 'fields', label: 'Fields to Extract', type: 'string', default: 'person_name, company, role, date, dollar_amount', description: 'Comma-separated field names' },
          {
            key: 'text_input', label: 'Input Text', type: 'textarea',
            default: `Meridian Corp CEO Sarah Chen announced the $4.2 billion acquisition of CloudScale, expected to close in Q3 2025. The deal brings 2,000 employees to Meridian's enterprise division. CloudScale co-founder James Park will become SVP of Cloud Engineering.`,
            description: 'Text to extract data from',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'agg-ext-json', name: 'Valid JSON', weight: 20, description: 'Response parses as valid JSON', scoringMethod: 'algorithmic', algorithmicCheck: 'json_validity', scale: { min: 0, max: 5 } },
            { id: 'agg-ext-keys', name: 'Key Completeness', weight: 25, description: 'All requested keys are present', scoringMethod: 'algorithmic', algorithmicCheck: 'json_keys', scale: { min: 0, max: 5 } },
            { id: 'agg-ext-values', name: 'Value Accuracy', weight: 40, description: 'Extracted values match the reference extraction', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'agg-ext-halluc', name: 'No Hallucination', weight: 15, description: 'Model did not invent data not in the source', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['extraction', 'json', 'structured-output'],
      },
      {
        id: 'agg-keypoints',
        categoryId: 'aggregation',
        name: 'Key Point Identification',
        description: 'Identify and rank the most important points in a document',
        prompt: `Read the following document and identify the top {{num_points}} key points. For each key point, provide a one-sentence summary and rate its importance on a scale of 1-5.

{{document_text}}`,
        expectedBehavior: 'Correct number of key points, each with a one-sentence summary and 1-5 importance rating.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1, description: 'Lower = more focused' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 500, min: 200, max: 1000, step: 100, description: 'Maximum response length' },
          { key: 'num_points', label: 'Number of Key Points', type: 'number', default: 5, min: 3, max: 10, step: 1, description: 'How many key points to identify' },
          {
            key: 'document_text', label: 'Document', type: 'textarea',
            default: `Remote Work Policy Update - Effective March 2025

All full-time employees may work remotely up to 3 days per week. Managers must approve remote schedules by the 15th of the preceding month. Core hours of 10 AM - 2 PM ET must be maintained for all remote workers. VPN usage is mandatory when accessing company systems remotely. Home office equipment stipends of $500 annually will be provided starting Q2. Performance reviews will include remote work effectiveness metrics. Team leads are responsible for maintaining collaboration standards. International remote work requires HR and legal approval with a 30-day notice period. Employees in client-facing roles may have additional in-office requirements. The policy will be reviewed quarterly based on productivity data and employee feedback.`,
            description: 'Document to analyze',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'agg-kp-format', name: 'Format Compliance', weight: 20, description: 'Correct number of points with summaries and ratings', scoringMethod: 'algorithmic', algorithmicCheck: 'key_point_format', scale: { min: 0, max: 5 } },
            { id: 'agg-kp-relevance', name: 'Relevance', weight: 35, description: 'Identified points are the most important ones', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'agg-kp-ranking', name: 'Ranking Quality', weight: 25, description: 'Importance ratings make sense relative to each other', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'agg-kp-concise', name: 'Conciseness', weight: 20, description: 'Each summary is genuinely one sentence', scoringMethod: 'algorithmic', algorithmicCheck: 'sentence_count', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['key-points', 'ranking', 'analysis'],
      },
    ],
  },

  // ================================================================
  // RESEARCH
  // ================================================================
  {
    id: 'research',
    name: 'Research',
    description: 'Fact retrieval, source analysis, and multi-step reasoning',
    icon: 'search',
    scenarios: [
      {
        id: 'res-factual',
        categoryId: 'research',
        name: 'Factual Knowledge Retrieval',
        description: 'Answer factual questions with supporting evidence',
        prompt: `Answer the following factual question in 2-3 sentences. Cite the key fact or principle that supports your answer.

Question: {{question}}`,
        expectedBehavior: '2-3 sentence answer with a cited fact or principle. Factually correct.',
        referenceAnswer: 'The speed of light in a vacuum is approximately 299,792,458 meters per second (about 186,282 miles per second). Ole Roemer made the first quantitative estimate in 1676 by observing the eclipses of Jupiter\'s moon Io, though Albert Michelson later provided highly accurate measurements in the late 1800s.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.2, min: 0, max: 1, step: 0.1, description: 'Lower = more focused' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 200, min: 100, max: 500, step: 50, description: 'Maximum response length' },
          { key: 'question', label: 'Question', type: 'textarea', default: 'What is the speed of light in a vacuum, and who first accurately measured it?', description: 'Factual question to answer' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'res-fact-correct', name: 'Factual Correctness', weight: 45, description: 'Answer is factually accurate', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-fact-citation', name: 'Citation Provided', weight: 20, description: 'Response includes a cited fact or principle', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-fact-length', name: 'Appropriate Length', weight: 15, description: 'Response is 2-3 sentences', scoringMethod: 'algorithmic', algorithmicCheck: 'sentence_range', scale: { min: 0, max: 5 } },
            { id: 'res-fact-clarity', name: 'Clarity', weight: 20, description: 'Explanation is clear and well-structured', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['factual', 'knowledge', 'citation'],
      },
      {
        id: 'res-multisource',
        categoryId: 'research',
        name: 'Multi-Source Synthesis',
        description: 'Synthesize information from multiple sources and identify contradictions',
        prompt: `Given the following three sources, answer the question below. Your answer must synthesize information from at least two of the sources. Identify any contradictions between sources.

Source 1:
{{source_1}}

Source 2:
{{source_2}}

Source 3:
{{source_3}}

Question: {{question}}`,
        expectedBehavior: 'Answer draws from 2+ sources, contradictions are identified, reasoning is coherent.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1, description: 'Lower = more focused' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 500, min: 200, max: 1000, step: 100, description: 'Maximum response length' },
          {
            key: 'source_1', label: 'Source 1', type: 'textarea',
            default: 'According to the city planning report (2024), the new transit line will reduce commute times by 25% and serve approximately 50,000 daily riders. Construction is expected to be completed by 2027 at a cost of $2.1 billion.',
            description: 'First source text',
          },
          {
            key: 'source_2', label: 'Source 2', type: 'textarea',
            default: 'An independent engineering assessment found that the transit project will likely exceed its budget by 40%, pushing costs to nearly $3 billion. The assessment also projects only 35,000 daily riders based on population density analysis. However, it confirms the commute time reduction of 20-25%.',
            description: 'Second source text',
          },
          {
            key: 'source_3', label: 'Source 3', type: 'textarea',
            default: 'Community surveys show 72% support for the transit project. Local businesses along the route expect a 15% increase in foot traffic. Environmental groups praise the project for potentially reducing car emissions by 8,000 tons annually. Completion is optimistically targeted for late 2026.',
            description: 'Third source text',
          },
          { key: 'question', label: 'Question', type: 'textarea', default: 'What is the likely impact of the new transit line, and how reliable are the official projections?', description: 'Question to answer' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'res-ms-synthesis', name: 'Multi-Source Synthesis', weight: 30, description: 'Answer draws from 2+ sources', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-ms-contra', name: 'Contradiction Identification', weight: 25, description: 'Contradictions between sources are correctly identified', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-ms-logic', name: 'Logical Coherence', weight: 25, description: 'Reasoning chain holds together', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-ms-hedge', name: 'Appropriate Hedging', weight: 20, description: 'Model expresses uncertainty when sources conflict', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['synthesis', 'multi-source', 'contradictions'],
      },
      {
        id: 'res-compare',
        categoryId: 'research',
        name: 'Comparative Analysis',
        description: 'Compare and contrast subjects across multiple dimensions',
        prompt: `Compare and contrast {{subject_a}} and {{subject_b}} across the following dimensions: {{dimensions}}. Present your analysis in a structured format.`,
        expectedBehavior: 'Structured comparison covering all dimensions, balanced analysis, factually accurate claims.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.4, min: 0, max: 1, step: 0.1, description: 'Controls creativity' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 800, min: 300, max: 1500, step: 100, description: 'Maximum response length' },
          { key: 'subject_a', label: 'Subject A', type: 'string', default: 'PostgreSQL', description: 'First subject' },
          { key: 'subject_b', label: 'Subject B', type: 'string', default: 'MongoDB', description: 'Second subject' },
          { key: 'dimensions', label: 'Dimensions', type: 'string', default: 'data model, scalability, query language, use cases', description: 'Comparison dimensions' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'res-cmp-structure', name: 'Structured Format', weight: 20, description: 'Clear organization with headings or table', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-cmp-coverage', name: 'Dimension Coverage', weight: 25, description: 'All requested dimensions addressed', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-cmp-balance', name: 'Balance', weight: 20, description: 'Fair comparison covering strengths/weaknesses of both', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'res-cmp-accuracy', name: 'Factual Accuracy', weight: 35, description: 'Technical claims are correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['comparison', 'analysis', 'structured'],
      },
    ],
  },

  // ================================================================
  // COMPOSITION
  // ================================================================
  {
    id: 'composition',
    name: 'Composition',
    description: 'Creative writing, technical writing, and code generation',
    icon: 'pen',
    scenarios: [
      {
        id: 'comp-creative',
        categoryId: 'composition',
        name: 'Creative Writing',
        description: 'Write a short story with specified constraints',
        prompt: `Write a short story (200-300 words) in the genre of {{genre}} that includes the following elements: {{elements}}. The story must have a clear beginning, middle, and end.`,
        expectedBehavior: '200-300 word story in specified genre, all elements included, clear narrative arc.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.8, min: 0, max: 2, step: 0.1, description: 'Higher = more creative' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 600, min: 300, max: 1500, step: 100, description: 'Maximum response length' },
          {
            key: 'genre', label: 'Genre', type: 'select', default: 'science fiction',
            options: [
              { label: 'Science Fiction', value: 'science fiction' },
              { label: 'Mystery', value: 'mystery' },
              { label: 'Fantasy', value: 'fantasy' },
              { label: 'Literary Fiction', value: 'literary fiction' },
            ],
            description: 'Story genre',
          },
          { key: 'elements', label: 'Required Elements', type: 'string', default: 'a broken clock, an unexpected visitor, a decision that cannot be undone', description: 'Elements that must appear in the story' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'comp-cr-wordcount', name: 'Word Count', weight: 10, description: 'Story is within 200-300 words', scoringMethod: 'algorithmic', algorithmicCheck: 'word_count_range', scale: { min: 0, max: 5 } },
            { id: 'comp-cr-elements', name: 'Element Inclusion', weight: 20, description: 'All specified elements are present', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-cr-structure', name: 'Narrative Structure', weight: 25, description: 'Clear beginning, middle, and end', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-cr-genre', name: 'Genre Adherence', weight: 20, description: 'Story fits the specified genre', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-cr-prose', name: 'Prose Quality', weight: 25, description: 'Engaging language, voice, and imagery', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['creative', 'fiction', 'narrative'],
      },
      {
        id: 'comp-technical',
        categoryId: 'composition',
        name: 'Technical Writing',
        description: 'Write API documentation for an endpoint',
        prompt: `Write API documentation for the following endpoint. Include: endpoint URL, HTTP method, request parameters (with types and required/optional), example request, example response, and error codes.

Endpoint description: {{endpoint_description}}`,
        expectedBehavior: 'Complete API docs with all sections, realistic examples, proper formatting.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.2, min: 0, max: 1, step: 0.1, description: 'Lower = more precise' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 500, max: 2000, step: 100, description: 'Maximum response length' },
          {
            key: 'endpoint_description', label: 'Endpoint Description', type: 'textarea',
            default: 'A REST endpoint that allows users to search for products by name, category, and price range. Returns paginated results with product details including images, ratings, and availability status.',
            description: 'Description of the API endpoint to document',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'comp-tech-sections', name: 'Section Completeness', weight: 30, description: 'All required sections present (URL, method, params, examples, errors)', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-tech-accuracy', name: 'Technical Accuracy', weight: 25, description: 'HTTP methods, status codes, and parameter types are reasonable', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-tech-examples', name: 'Example Quality', weight: 25, description: 'Request/response examples are realistic and consistent', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-tech-clarity', name: 'Clarity and Formatting', weight: 20, description: 'Well-formatted with code blocks and clear writing', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['technical', 'documentation', 'api'],
      },
      {
        id: 'comp-code',
        categoryId: 'composition',
        name: 'Code Generation',
        description: 'Generate a function with error handling and documentation',
        prompt: `Write a {{language}} function that {{task_description}}. Include error handling, type annotations (if applicable), and a brief doc comment explaining the function.`,
        expectedBehavior: 'Syntactically correct code with error handling, types, and documentation.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.2, min: 0, max: 1, step: 0.1, description: 'Lower = more precise' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 800, min: 300, max: 2000, step: 100, description: 'Maximum response length' },
          {
            key: 'language', label: 'Language', type: 'select', default: 'TypeScript',
            options: [
              { label: 'TypeScript', value: 'TypeScript' },
              { label: 'Python', value: 'Python' },
              { label: 'JavaScript', value: 'JavaScript' },
              { label: 'Go', value: 'Go' },
            ],
            description: 'Programming language',
          },
          {
            key: 'task_description', label: 'Task', type: 'textarea',
            default: 'takes an array of objects with `name` (string) and `score` (number) fields, groups them by the first letter of their name, and returns an object where each key is a letter and each value is the average score for that group',
            description: 'What the function should do',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'comp-code-syntax', name: 'Syntactic Correctness', weight: 20, description: 'Code appears syntactically correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-code-func', name: 'Functional Correctness', weight: 30, description: 'Code would produce the correct output', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-code-errors', name: 'Error Handling', weight: 15, description: 'Edge cases handled (empty arrays, missing fields)', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-code-types', name: 'Type Annotations', weight: 15, description: 'Types are present and correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'comp-code-docs', name: 'Documentation', weight: 20, description: 'Has a doc comment explaining the function', scoringMethod: 'algorithmic', algorithmicCheck: 'has_doc_comment', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['code', 'programming', 'function'],
      },
    ],
  },

  // ================================================================
  // REASONING
  // ================================================================
  {
    id: 'reasoning',
    name: 'Reasoning',
    description: 'Logic puzzles, math problems, and causal reasoning',
    icon: 'brain',
    scenarios: [
      {
        id: 'reas-logic',
        categoryId: 'reasoning',
        name: 'Logic Puzzle',
        description: 'Solve a logic puzzle with step-by-step reasoning',
        prompt: `Solve the following logic puzzle step by step. Show your reasoning clearly.

{{puzzle}}`,
        expectedBehavior: 'Correct answer with clear step-by-step deduction. No contradictions.',
        referenceAnswer: 'The answer requires systematic elimination using the given constraints.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.1, min: 0, max: 1, step: 0.1, description: 'Lower = more focused' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 800, min: 300, max: 1500, step: 100, description: 'Maximum response length' },
          {
            key: 'puzzle', label: 'Puzzle', type: 'textarea',
            default: `Three friends - Alice, Bob, and Carol - each have a different favorite color (red, blue, green) and a different pet (cat, dog, fish).

Clues:
1. Alice does not like red.
2. The person who likes blue has a cat.
3. Bob does not have a dog.
4. Carol likes green.
5. The person with the fish likes red.

What color does each person like, and what pet does each have?`,
            description: 'The logic puzzle to solve',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'reas-log-answer', name: 'Correct Answer', weight: 40, description: 'Final answer matches the known solution', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-log-steps', name: 'Step-by-Step Reasoning', weight: 30, description: 'Intermediate deductions are shown and logically valid', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-log-consist', name: 'No Contradictions', weight: 20, description: 'Model does not contradict itself during reasoning', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-log-complete', name: 'Completeness', weight: 10, description: 'All parts of the puzzle are addressed', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['logic', 'deduction', 'puzzle'],
      },
      {
        id: 'reas-math',
        categoryId: 'reasoning',
        name: 'Mathematical Problem',
        description: 'Solve a math word problem showing work',
        prompt: `Solve the following math problem. Show your work step by step.

{{problem}}`,
        expectedBehavior: 'Correct final answer with valid mathematical steps. Units included.',
        referenceAnswer: 'The trains meet at 12:00 PM (noon), 180 miles from Station A.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0, min: 0, max: 0.5, step: 0.1, description: 'Keep low for math' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 500, min: 200, max: 1000, step: 100, description: 'Maximum response length' },
          {
            key: 'problem', label: 'Problem', type: 'textarea',
            default: 'A train leaves Station A at 9:00 AM traveling at 60 mph. Another train leaves Station B, 300 miles away, at 10:00 AM traveling toward Station A at 80 mph. At what time do the trains meet, and how far from Station A?',
            description: 'Math problem to solve',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'reas-math-answer', name: 'Correct Final Answer', weight: 40, description: 'Final numerical answer is correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-math-steps', name: 'Valid Steps', weight: 30, description: 'Equations and arithmetic are correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-math-present', name: 'Clear Presentation', weight: 15, description: 'Work is easy to follow', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-math-units', name: 'Units and Labels', weight: 15, description: 'Units are included and correct', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['math', 'word-problem', 'arithmetic'],
      },
      {
        id: 'reas-causal',
        categoryId: 'reasoning',
        name: 'Causal Reasoning',
        description: 'Analyze a scenario for causes, factors, and interventions',
        prompt: `Analyze the following scenario and identify: (1) the primary cause, (2) contributing factors, (3) the most likely outcome if nothing changes, and (4) one intervention that could change the outcome.

{{scenario}}`,
        expectedBehavior: 'All 4 elements present with reasonable causal analysis and actionable intervention.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1, description: 'Controls creativity' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 600, min: 300, max: 1000, step: 100, description: 'Maximum response length' },
          {
            key: 'scenario', label: 'Scenario', type: 'textarea',
            default: `A mid-size tech company has seen employee turnover increase from 12% to 28% over the past year. Exit interviews reveal that employees cite lack of career growth (67%), below-market compensation (54%), and poor work-life balance (48%) as top reasons. The company recently froze promotions during a cost-cutting period, and competitors in the area have been aggressively recruiting. Meanwhile, the remaining team is reporting increased workloads and declining morale.`,
            description: 'Scenario to analyze',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'reas-caus-structure', name: 'Structure Compliance', weight: 15, description: 'All 4 requested elements are present', scoringMethod: 'algorithmic', algorithmicCheck: 'numbered_sections', scale: { min: 0, max: 5 } },
            { id: 'reas-caus-primary', name: 'Causal Identification', weight: 30, description: 'Primary cause is reasonable and well-supported', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-caus-factors', name: 'Factor Analysis', weight: 25, description: 'Contributing factors are distinct and relevant', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'reas-caus-intervene', name: 'Intervention Quality', weight: 30, description: 'Proposed intervention is specific, actionable, and plausible', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['causal', 'analysis', 'reasoning'],
      },
    ],
  },

  // ================================================================
  // INSTRUCTION FOLLOWING
  // ================================================================
  {
    id: 'instruction-following',
    name: 'Instruction Following',
    description: 'Complex multi-step instructions, format adherence, and constraints',
    icon: 'list-checks',
    scenarios: [
      {
        id: 'inst-multistep',
        categoryId: 'instruction-following',
        name: 'Multi-Step Instructions',
        description: 'Follow multiple exact instructions in sequence',
        prompt: `Follow these instructions EXACTLY:
1. Write a haiku about technology
2. Below the haiku, list exactly 3 programming languages that start with the letter 'P'
3. Convert the number 42 to binary and include it on its own line
4. End your response with exactly the phrase 'TASK COMPLETE' on its own line`,
        expectedBehavior: 'Haiku (3 lines), exactly 3 P-languages, correct binary (101010), exact closing phrase.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.2, min: 0, max: 1, step: 0.1, description: 'Lower = more precise' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 300, min: 100, max: 500, step: 50, description: 'Maximum response length' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'inst-ms-haiku', name: 'Haiku Format', weight: 25, description: 'First element is a 3-line haiku', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'inst-ms-list', name: 'Language List', weight: 25, description: 'Exactly 3 real programming languages starting with P', scoringMethod: 'algorithmic', algorithmicCheck: 'p_languages', scale: { min: 0, max: 5 } },
            { id: 'inst-ms-binary', name: 'Binary Conversion', weight: 25, description: '101010 is present', scoringMethod: 'algorithmic', algorithmicCheck: 'contains_string', scale: { min: 0, max: 5 } },
            { id: 'inst-ms-closing', name: 'Exact Closing Phrase', weight: 25, description: 'Response ends with TASK COMPLETE', scoringMethod: 'algorithmic', algorithmicCheck: 'ends_with', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['instructions', 'multi-step', 'exact'],
      },
      {
        id: 'inst-json',
        categoryId: 'instruction-following',
        name: 'Structured Output (JSON)',
        description: 'Return valid JSON matching an exact schema with no extra content',
        prompt: `Respond ONLY with a valid JSON object (no markdown code fences, no explanation) matching this exact schema:
{
  "title": string,
  "summary": string (max 50 words),
  "tags": string[] (exactly 5 tags),
  "difficulty": number (1-10)
}

Topic: {{topic}}`,
        expectedBehavior: 'Only a JSON object. Valid JSON, correct schema, summary under 50 words, exactly 5 tags, difficulty 1-10.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.1, min: 0, max: 1, step: 0.1, description: 'Keep very low' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 300, min: 100, max: 500, step: 50, description: 'Maximum response length' },
          { key: 'topic', label: 'Topic', type: 'string', default: 'Introduction to quantum computing for beginners', description: 'Topic for the JSON response' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'inst-json-valid', name: 'Valid JSON', weight: 25, description: 'Response parses as valid JSON', scoringMethod: 'algorithmic', algorithmicCheck: 'json_validity', scale: { min: 0, max: 5 } },
            { id: 'inst-json-clean', name: 'No Extra Content', weight: 15, description: 'Response is ONLY the JSON (no prose, no code fences)', scoringMethod: 'algorithmic', algorithmicCheck: 'json_only', scale: { min: 0, max: 5 } },
            { id: 'inst-json-schema', name: 'Schema Compliance', weight: 30, description: 'All keys present, correct types, constraints met', scoringMethod: 'algorithmic', algorithmicCheck: 'json_schema', scale: { min: 0, max: 5 } },
            { id: 'inst-json-quality', name: 'Content Quality', weight: 30, description: 'Title, summary, and tags are relevant and sensible', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['json', 'structured-output', 'schema'],
      },
      {
        id: 'inst-constrained',
        categoryId: 'instruction-following',
        name: 'Constraint-Based Writing',
        description: 'Write within multiple simultaneous constraints',
        prompt: `Write a product description for {{product}} that:
- Is exactly {{word_count}} words (+-5 words tolerance)
- Does NOT use the words: {{banned_words}}
- Mentions the price ${{price}} exactly once
- Includes exactly {{num_features}} bullet points for key features
- Ends with a call to action`,
        expectedBehavior: 'Meets word count, avoids banned words, mentions price once, correct bullet count, ends with CTA.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, description: 'Moderate creativity' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 400, min: 200, max: 800, step: 50, description: 'Maximum response length' },
          { key: 'product', label: 'Product', type: 'string', default: 'wireless noise-canceling headphones', description: 'Product to describe' },
          { key: 'word_count', label: 'Target Word Count', type: 'number', default: 100, min: 50, max: 300, step: 10, description: 'Exact word count target' },
          { key: 'banned_words', label: 'Banned Words', type: 'string', default: 'best, amazing, revolutionary, incredible', description: 'Comma-separated words to avoid' },
          { key: 'price', label: 'Price', type: 'string', default: '79.99', description: 'Product price' },
          { key: 'num_features', label: 'Feature Bullet Count', type: 'number', default: 4, min: 2, max: 8, step: 1, description: 'Number of feature bullets' },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'inst-con-words', name: 'Word Count', weight: 20, description: 'Within +-5 of target', scoringMethod: 'algorithmic', algorithmicCheck: 'word_count_tolerance', scale: { min: 0, max: 5 } },
            { id: 'inst-con-banned', name: 'Banned Word Avoidance', weight: 20, description: 'All banned words absent', scoringMethod: 'algorithmic', algorithmicCheck: 'banned_words', scale: { min: 0, max: 5 } },
            { id: 'inst-con-price', name: 'Price Mention', weight: 15, description: 'Price mentioned exactly once', scoringMethod: 'algorithmic', algorithmicCheck: 'exact_count', scale: { min: 0, max: 5 } },
            { id: 'inst-con-bullets', name: 'Feature Bullet Count', weight: 15, description: 'Exactly N bullet points', scoringMethod: 'algorithmic', algorithmicCheck: 'bullet_count', scale: { min: 0, max: 5 } },
            { id: 'inst-con-cta', name: 'Call to Action', weight: 15, description: 'Ends with a clear CTA', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'inst-con-quality', name: 'Overall Quality', weight: 15, description: 'Compelling and coherent writing', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['constraints', 'writing', 'word-count'],
      },
    ],
  },

  // ================================================================
  // CONVERSATION & CONTEXT
  // ================================================================
  {
    id: 'conversation',
    name: 'Conversation & Context',
    description: 'Persona consistency, clarification, and context handling',
    icon: 'messages',
    scenarios: [
      {
        id: 'conv-persona',
        categoryId: 'conversation',
        name: 'Persona Consistency',
        description: 'Maintain a character across challenging prompts',
        prompt: `{{follow_up}}`,
        systemPrompt: '{{persona_description}}',
        expectedBehavior: 'Stays in character, avoids anachronisms, creatively handles unknown concepts.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1.5, step: 0.1, description: 'Higher = more creative' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 300, min: 100, max: 500, step: 50, description: 'Maximum response length' },
          {
            key: 'persona_description', label: 'Persona', type: 'textarea',
            default: 'You are a medieval blacksmith named Aldric. You know nothing about modern technology. You speak in a slightly archaic manner. Stay in character no matter what the user asks.',
            description: 'System prompt defining the persona',
          },
          {
            key: 'follow_up', label: 'User Message', type: 'textarea',
            default: 'Aldric, what do you think about smartphones?',
            description: 'Message to test persona consistency',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'conv-per-char', name: 'Character Maintenance', weight: 40, description: 'Model stays in character throughout', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-per-anach', name: 'No Anachronisms', weight: 30, description: 'Avoids referencing modern knowledge', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-per-creative', name: 'Creativity', weight: 15, description: 'Response is engaging and flavorful', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-per-react', name: 'Natural Reaction', weight: 15, description: 'Character reacts naturally to unknown concepts', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['persona', 'roleplay', 'consistency'],
      },
      {
        id: 'conv-clarify',
        categoryId: 'conversation',
        name: 'Clarification Requesting',
        description: 'Ask for clarification instead of guessing on vague prompts',
        prompt: `{{vague_request}}`,
        expectedBehavior: 'Asks clarifying questions for missing information. Does not guess or hallucinate details.',
        configurableVars: [
          { key: 'temperature', label: 'Temperature', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1, description: 'Controls response style' },
          { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 300, min: 100, max: 500, step: 50, description: 'Maximum response length' },
          {
            key: 'vague_request', label: 'Vague Request', type: 'textarea',
            default: 'Schedule a meeting with the team.',
            description: 'An intentionally vague prompt to test if the model asks for clarification',
          },
        ],
        scoringRubric: {
          maxScore: 100,
          metrics: [
            { id: 'conv-clar-asks', name: 'Asks Clarifying Questions', weight: 40, description: 'Model asks for missing information rather than guessing', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-clar-missing', name: 'Identifies Key Missing Info', weight: 35, description: 'Asks about date/time, participants, topic', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-clar-tone', name: 'Helpful Tone', weight: 15, description: 'Response is friendly and constructive', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
            { id: 'conv-clar-nohalluc', name: 'No Hallucinated Assumptions', weight: 10, description: 'Does not make up specific details', scoringMethod: 'llm-judge', scale: { min: 0, max: 5 } },
          ],
        },
        tags: ['clarification', 'context', 'vague'],
      },
    ],
  },
];

export function getCategoryById(id: string): TestCategory | undefined {
  return TEST_CATEGORIES.find(c => c.id === id);
}

export function getScenarioById(id: string): { category: TestCategory; scenario: import('../../../shared/types').TestScenario } | undefined {
  for (const cat of TEST_CATEGORIES) {
    const scenario = cat.scenarios.find(s => s.id === id);
    if (scenario) return { category: cat, scenario };
  }
  return undefined;
}
