import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import { executeJavaAST } from '../src/services/javaInterpreter';

function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function runJavaWithGeminiFallback(code: string, startTime: number) {
  // Check brace depth first
  let braceDepth = 0;
  for (const ch of code) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
  }
  if (braceDepth !== 0) {
    return {
      success: false,
      compilationError: 'Main.java: error: reached end of file while parsing (unbalanced curly braces)',
      runtimeError: null,
      stdout: '',
      stderr: 'Main.java: error: reached end of file while parsing',
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 1. Run local AST engine first
  const astResult = executeJavaAST(code);
  if (astResult.success || astResult.runtimeError) {
    return {
      ...astResult,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. If AST reported a compilation error, try Gemini if key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    for (const modelName of ['gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Act as an exact Java 21 compiler (javac) and JVM (java Main). Evaluate the following Main.java code and return ONLY valid JSON with fields:
{
  "compilationError": string | null,
  "runtimeError": string | null,
  "stdout": string
}
Do not wrap in markdown code blocks. Be 100% faithful to Java syntax, types, access modifiers, and standard output.

Code:
${code}`,
        });

        if (response && response.text) {
          const cleanJson = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleanJson);
          const hasCompErr = !!parsed.compilationError;
          const hasRunErr = !!parsed.runtimeError;
          return {
            success: !hasCompErr && !hasRunErr,
            compilationError: parsed.compilationError || null,
            runtimeError: parsed.runtimeError || null,
            stdout: parsed.stdout || '',
            stderr: parsed.compilationError || parsed.runtimeError || '',
            executionTimeMs: Date.now() - startTime,
          };
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  return {
    ...astResult,
    executionTimeMs: Date.now() - startTime,
  };
}

export default async function handler(req: IncomingMessage & { body?: any; url?: string }, res: ServerResponse) {
  const url = req.url || '';
  const body = await parseBody(req);
  const startTime = Date.now();

  if (url.includes('/api/java/run')) {
    const code = body?.code;
    if (!code || typeof code !== 'string') {
      return sendJson(res, 400, { error: 'Java code string is required' });
    }
    const result = await runJavaWithGeminiFallback(code, startTime);
    return sendJson(res, 200, result);
  }

  if (url.includes('/api/java/test')) {
    const code = body?.code;
    const testCases = Array.isArray(body?.testCases) ? body.testCases : [];
    if (!code || typeof code !== 'string') {
      return sendJson(res, 400, { error: 'Code is required for test execution' });
    }

    const execResult = await runJavaWithGeminiFallback(code, startTime);
    if (execResult.compilationError) {
      return sendJson(res, 200, {
        ...execResult,
        testResults: [],
        allTestsPassed: false,
      });
    }

    const normalizeOut = (s: string) =>
      s
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim();

    const actualOutput = normalizeOut(execResult.stdout || '');
    let allPassed = true;
    const testResults = testCases.map((tc: any) => {
      const expectedOutput = normalizeOut(tc.expectedOutput || '');
      const passed = actualOutput === expectedOutput;
      if (!passed) allPassed = false;
      return {
        testCaseId: tc.id,
        description: tc.description,
        passed,
        input: tc.input || '',
        expected: tc.isHidden ? '[HIDDEN TEST CASE]' : expectedOutput,
        actual: tc.isHidden && !passed ? '[OUTPUT MISMATCH]' : actualOutput,
        isHidden: !!tc.isHidden,
      };
    });

    if (testCases.length === 0) {
      allPassed = execResult.success;
    }

    return sendJson(res, 200, {
      ...execResult,
      success: allPassed,
      testResults,
      allTestsPassed: allPassed,
    });
  }

  if (url.includes('/api/tutor/explain')) {
    const { code, concept, question, errorLog } = body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `You are the Arcane Java Tutor in OOP Quest.\nConcept: "${concept || 'Java OOP'}"\nQuestion: "${question || 'Help fix this code'}"\nErrors: "${errorLog || 'None'}"\nCode:\n${code || ''}`,
        });
        if (response?.text) {
          return sendJson(res, 200, { advice: response.text });
        }
      } catch {
        // Fallback below
      }
    }
    return sendJson(res, 200, {
      advice: `Focus on ${concept || 'OOP'} principles: verify private fields, method signatures, class hierarchy, and constructor initialization.`,
    });
  }

  return sendJson(res, 200, { status: 'ok' });
}
