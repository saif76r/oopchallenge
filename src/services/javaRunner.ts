import { ExecutionResult, TestCase } from '../types';
import { executeJavaAST } from './javaInterpreter';

function evaluateJavaLocally(code: string): ExecutionResult {
  const res = executeJavaAST(code);
  return {
    success: res.success,
    compilationError: res.compilationError || undefined,
    runtimeError: res.runtimeError || undefined,
    stdout: res.stdout,
    stderr: res.stderr,
    executionTimeMs: res.executionTimeMs,
    testResults: [],
    allTestsPassed: false,
  };
}

export async function runJavaCode(code: string, stdin: string = ''): Promise<ExecutionResult> {
  // Execute immediately using the built-in Java AST engine (< 10ms)
  const localRes = evaluateJavaLocally(code);
  if (localRes.success || localRes.runtimeError) {
    return localRes;
  }

  try {
    const response = await fetch('/api/java/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, stdin }),
    });

    if (!response.ok) {
      return localRes;
    }

    const data = await response.json();
    return {
      success: data.success,
      compilationError: data.compilationError,
      runtimeError: data.runtimeError,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      executionTimeMs: data.executionTimeMs || 0,
      testResults: [],
      allTestsPassed: false,
    };
  } catch {
    return localRes;
  }
}

export async function testJavaChallenge(
  code: string,
  testCases: TestCase[],
  missionId: string
): Promise<ExecutionResult> {
  // Run fast local Java AST engine first (< 10ms)
  let localExec = evaluateJavaLocally(code);

  if (localExec.compilationError) {
    try {
      const response = await fetch('/api/java/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, testCases, missionId }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall through to local result
    }
    return localExec;
  }

  const normalizeOut = (s: string) =>
    s
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();

  const actualOutput = normalizeOut(localExec.stdout || '');
  let allPassed = true;
  const testResults = testCases.map((tc) => {
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
    allPassed = localExec.success;
  }

  return {
    ...localExec,
    success: allPassed,
    testResults,
    allTestsPassed: allPassed,
  };
}

export async function askAITutor(
  code: string,
  concept: string,
  question: string,
  errorLog?: string
): Promise<{ advice: string; hintTier?: number }> {
  try {
    const response = await fetch('/api/tutor/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, concept, question, errorLog }),
    });

    if (!response.ok) {
      return {
        advice: 'Focus on the required method signature and ensure all syntax matches standard Java OOP guidelines.',
      };
    }

    const data = await response.json();
    return data;
  } catch {
    return {
      advice: 'The Arcane AI Tutor recommends double-checking access modifiers and class bracket closures.',
    };
  }
}
