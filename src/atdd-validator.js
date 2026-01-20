/**
 * ATDD Ciellos Guidelines Validator
 * MCP Tools for validating AL test code against Ciellos ATDD standards
 */

class ATDDValidator {
  
  /**
   * Validate test procedure naming convention
   * Rule: T####_<ShortScenarioName> format, PascalCase, ends with FDW
   */
  validateTestNaming(code) {
    const issues = [];
    const procedurePattern = /procedure\s+([A-Za-z0-9_]+)\s*\(/g;
    const testPattern = /\[Test\]\s*(?:\[HandlerFunctions\([^\)]*\)\])?\s*procedure\s+([A-Za-z0-9_]+)/g;
    
    let match;
    while ((match = testPattern.exec(code)) !== null) {
      const procName = match[1];
      
      // Check T#### prefix
      if (!/^T\d{4}_/.test(procName)) {
        issues.push({
          rule: 'TEST_NAMING_PREFIX',
          severity: 'error',
          message: `Test procedure "${procName}" must start with T#### prefix (e.g., T0001_)`,
          line: this.getLineNumber(code, match.index)
        });
      }
      
      // Check for quotes in name (forbidden)
      if (procName.includes('"') || procName.includes("'")) {
        issues.push({
          rule: 'TEST_NAMING_QUOTES',
          severity: 'error',
          message: `Test procedure "${procName}" must not contain quotation marks`,
          line: this.getLineNumber(code, match.index)
        });
      }
      
      // Check length (under 120 characters)
      if (procName.length > 120) {
        issues.push({
          rule: 'TEST_NAMING_LENGTH',
          severity: 'warning',
          message: `Test procedure "${procName}" exceeds 120 characters`,
          line: this.getLineNumber(code, match.index)
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate GIVEN-WHEN-THEN comment structure
   * Rule: ALL comments must be [SCENARIO], [GIVEN], [WHEN], or [THEN]
   */
  validateCommentStructure(code) {
    const issues = [];
    const testBlocks = this.extractTestBlocks(code);
    
    for (const block of testBlocks) {
      const { name, content, startLine } = block;
      
      // Check for SCENARIO comment
      if (!content.includes('// [SCENARIO')) {
        issues.push({
          rule: 'MISSING_SCENARIO',
          severity: 'error',
          message: `Test "${name}" missing // [SCENARIO X] comment`,
          line: startLine
        });
      }
      
      // Check for GIVEN
      if (!content.includes('// [GIVEN]')) {
        issues.push({
          rule: 'MISSING_GIVEN',
          severity: 'error',
          message: `Test "${name}" missing // [GIVEN] comment`,
          line: startLine
        });
      }
      
      // Check for WHEN
      if (!content.includes('// [WHEN]')) {
        issues.push({
          rule: 'MISSING_WHEN',
          severity: 'error',
          message: `Test "${name}" missing // [WHEN] comment`,
          line: startLine
        });
      }
      
      // Check for THEN
      if (!content.includes('// [THEN]')) {
        issues.push({
          rule: 'MISSING_THEN',
          severity: 'error',
          message: `Test "${name}" missing // [THEN] comment`,
          line: startLine
        });
      }
      
      // Check for forbidden extra comments
      const commentPattern = /\/\/\s*(?!\[SCENARIO|\[GIVEN\]|\[WHEN\]|\[THEN\])([^\n]+)/g;
      let commentMatch;
      while ((commentMatch = commentPattern.exec(content)) !== null) {
        const comment = commentMatch[1].trim();
        // Skip empty or whitespace-only
        if (comment && !comment.startsWith('[')) {
          issues.push({
            rule: 'FORBIDDEN_COMMENT',
            severity: 'error',
            message: `Forbidden comment in test "${name}": "${comment.substring(0, 50)}..."`,
            line: startLine + this.getLineNumber(content, commentMatch.index)
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Validate TestPermissions property
   * Rule: TestPermissions = Disabled is forbidden
   */
  validateTestPermissions(code) {
    const issues = [];
    
    if (/TestPermissions\s*=\s*Disabled/i.test(code)) {
      issues.push({
        rule: 'FORBIDDEN_TESTPERMISSIONS_DISABLED',
        severity: 'error',
        message: 'TestPermissions = Disabled is forbidden. Use SetTestPermissions() procedure instead.',
        line: this.getLineNumber(code, code.indexOf('TestPermissions'))
      });
    }
    
    return issues;
  }

  /**
   * Validate Commit() usage
   * Rule: Commit() forbidden in test procedures, only allowed in Initialize()
   */
  validateCommitUsage(code) {
    const issues = [];
    const testBlocks = this.extractTestBlocks(code);
    
    for (const block of testBlocks) {
      const { name, content, startLine } = block;
      
      if (/\bCommit\s*\(\s*\)/i.test(content)) {
        issues.push({
          rule: 'FORBIDDEN_COMMIT_IN_TEST',
          severity: 'error',
          message: `Commit() is forbidden in test procedure "${name}". Only allowed in Initialize().`,
          line: startLine
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate object name length
   * Rule: AL object names must not exceed 30 characters
   */
  validateObjectNameLength(code) {
    const issues = [];
    const objectPattern = /(codeunit|table|page|report|xmlport|query|enum)\s+(\d+)\s+([A-Za-z0-9_"' ]+)/gi;
    
    let match;
    while ((match = objectPattern.exec(code)) !== null) {
      const objectName = match[3].replace(/["']/g, '').trim();
      if (objectName.length > 30) {
        issues.push({
          rule: 'OBJECT_NAME_LENGTH',
          severity: 'error',
          message: `Object name "${objectName}" exceeds 30 characters (${objectName.length} chars)`,
          line: this.getLineNumber(code, match.index)
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate scenario count matches procedure count
   * Rule: Number of [SCENARIO X] must match number of test procedures
   */
  validateScenarioCount(code) {
    const issues = [];
    
    const testCount = (code.match(/\[Test\]/g) || []).length;
    const scenarioMatches = code.match(/\/\/\s*\[SCENARIO\s+(\d+)\]/g) || [];
    const scenarioCount = scenarioMatches.length;
    
    if (testCount !== scenarioCount) {
      issues.push({
        rule: 'SCENARIO_COUNT_MISMATCH',
        severity: 'error',
        message: `Scenario count mismatch: ${testCount} test procedures but ${scenarioCount} scenarios`,
        line: 1
      });
    }
    
    // Check for sequential numbering
    const scenarioNumbers = scenarioMatches.map(s => {
      const match = s.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }).sort((a, b) => a - b);
    
    for (let i = 0; i < scenarioNumbers.length; i++) {
      if (scenarioNumbers[i] !== i + 1) {
        issues.push({
          rule: 'SCENARIO_NUMBERING_GAP',
          severity: 'warning',
          message: `Scenario numbering gap: expected ${i + 1} but found ${scenarioNumbers[i]}`,
          line: 1
        });
        break;
      }
    }
    
    return issues;
  }

  /**
   * Validate library function rules
   * Rule: No comments in library functions, single responsibility
   */
  validateLibraryFunctions(code) {
    const issues = [];
    
    // Check if this is a library codeunit
    if (!/Library[A-Za-z0-9]+/i.test(code)) {
      return issues; // Not a library codeunit
    }
    
    // Check for comments in library procedures
    const procPattern = /procedure\s+([A-Za-z0-9_]+)[^}]+?end;/gs;
    let match;
    while ((match = procPattern.exec(code)) !== null) {
      const procName = match[1];
      const procContent = match[0];
      
      // Skip if it's a test procedure
      if (code.substring(Math.max(0, match.index - 50), match.index).includes('[Test]')) {
        continue;
      }
      
      // Check for comments in library function
      if (/\/\/[^\n]+/.test(procContent)) {
        issues.push({
          rule: 'LIBRARY_NO_COMMENTS',
          severity: 'warning',
          message: `Library function "${procName}" should not contain comments`,
          line: this.getLineNumber(code, match.index)
        });
      }
    }
    
    return issues;
  }

  /**
   * Validate variable declaration order
   * Rule: Variables should be ordered by type (Record, Report, Codeunit, etc.)
   */
  validateVariableOrder(code) {
    const issues = [];
    const typeOrder = [
      'Record', 'Report', 'Codeunit', 'XmlPort', 'Page', 'Query',
      'Notification', 'BigText', 'DateFormula', 'RecordId', 'RecordRef',
      'FieldRef', 'FilterPageBuilder'
    ];
    
    const varBlockPattern = /\bvar\b([^;]*(?:;[^;]*)*?)(?=\bbegin\b)/gis;
    let varMatch;
    
    while ((varMatch = varBlockPattern.exec(code)) !== null) {
      const varBlock = varMatch[1];
      let lastTypeIndex = -1;
      
      for (const typeName of typeOrder) {
        const typePattern = new RegExp(`:\\s*${typeName}\\b`, 'i');
        if (typePattern.test(varBlock)) {
          const currentIndex = typeOrder.indexOf(typeName);
          if (currentIndex < lastTypeIndex) {
            issues.push({
              rule: 'VARIABLE_ORDER',
              severity: 'warning',
              message: `Variable of type "${typeName}" should be declared before previous type`,
              line: this.getLineNumber(code, varMatch.index)
            });
          }
          lastTypeIndex = Math.max(lastTypeIndex, currentIndex);
        }
      }
    }
    
    return issues;
  }

  /**
   * Run all validations
   */
  validateAll(code) {
    return {
      naming: this.validateTestNaming(code),
      comments: this.validateCommentStructure(code),
      permissions: this.validateTestPermissions(code),
      commit: this.validateCommitUsage(code),
      objectLength: this.validateObjectNameLength(code),
      scenarioCount: this.validateScenarioCount(code),
      library: this.validateLibraryFunctions(code),
      variableOrder: this.validateVariableOrder(code)
    };
  }

  /**
   * Get summary of all issues
   */
  getSummary(validationResult) {
    const allIssues = Object.values(validationResult).flat();
    const errors = allIssues.filter(i => i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');
    
    return {
      totalIssues: allIssues.length,
      errors: errors.length,
      warnings: warnings.length,
      passed: errors.length === 0,
      issues: allIssues
    };
  }

  // Helper methods
  extractTestBlocks(code) {
    const blocks = [];
    const testPattern = /\[Test\](?:\s*\[HandlerFunctions\([^\)]*\)\])?\s*procedure\s+([A-Za-z0-9_]+)[^;]*;?\s*((?:var[^;]*;)*)\s*begin([\s\S]*?)end;/g;
    
    let match;
    while ((match = testPattern.exec(code)) !== null) {
      blocks.push({
        name: match[1],
        content: match[0],
        startLine: this.getLineNumber(code, match.index)
      });
    }
    
    return blocks;
  }

  getLineNumber(code, index) {
    return code.substring(0, index).split('\n').length;
  }
}

// ATDD Rules Reference (for documentation tool)
const ATDD_RULES = {
  TEST_NAMING_PREFIX: {
    id: 'TEST_NAMING_PREFIX',
    description: 'Test procedures must use T####_ prefix format',
    example: 'procedure T0001_ValidateCustomerCreation()'
  },
  TEST_NAMING_QUOTES: {
    id: 'TEST_NAMING_QUOTES',
    description: 'Test procedure names must not contain quotation marks',
    example: 'Use PascalCase: BOMVersionTests16FDW instead of "ATDD 330789 BOM Version Tests"'
  },
  MISSING_SCENARIO: {
    id: 'MISSING_SCENARIO',
    description: 'Every test must have // [SCENARIO X] comment',
    example: '// [SCENARIO 1] Customer creation with valid data'
  },
  MISSING_GIVEN: {
    id: 'MISSING_GIVEN',
    description: 'Every test must have at least one // [GIVEN] comment',
    example: '// [GIVEN] Valid customer data is prepared'
  },
  MISSING_WHEN: {
    id: 'MISSING_WHEN',
    description: 'Every test must have at least one // [WHEN] comment with TestPage actions',
    example: '// [WHEN] User creates customer through the page'
  },
  MISSING_THEN: {
    id: 'MISSING_THEN',
    description: 'Every test must have at least one // [THEN] comment',
    example: '// [THEN] Customer is successfully created'
  },
  FORBIDDEN_COMMENT: {
    id: 'FORBIDDEN_COMMENT',
    description: 'Only [SCENARIO], [GIVEN], [WHEN], [THEN] comments allowed in tests',
    example: 'Remove all explanatory comments, keep only structured test comments'
  },
  FORBIDDEN_TESTPERMISSIONS_DISABLED: {
    id: 'FORBIDDEN_TESTPERMISSIONS_DISABLED',
    description: 'TestPermissions = Disabled is forbidden',
    example: 'Use SetTestPermissions() procedure with LibraryLowerPermissions instead'
  },
  FORBIDDEN_COMMIT_IN_TEST: {
    id: 'FORBIDDEN_COMMIT_IN_TEST',
    description: 'Commit() is forbidden in test procedures',
    example: 'Only use Commit() in Initialize() for one-time setup'
  },
  OBJECT_NAME_LENGTH: {
    id: 'OBJECT_NAME_LENGTH',
    description: 'AL object names must not exceed 30 characters',
    example: 'Use FormulationMgmt199FDW instead of FormulationManagementAdministration199FDW'
  },
  SCENARIO_COUNT_MISMATCH: {
    id: 'SCENARIO_COUNT_MISMATCH',
    description: 'Number of test procedures must match number of scenarios',
    example: '10 scenarios = exactly 10 test procedures (T0001 through T0010)'
  },
  LIBRARY_NO_COMMENTS: {
    id: 'LIBRARY_NO_COMMENTS',
    description: 'Library functions should be self-documenting without comments',
    example: 'Use clear naming like CreateCustomerWithLocationCode() instead of comments'
  },
  VARIABLE_ORDER: {
    id: 'VARIABLE_ORDER',
    description: 'Variables should be ordered by type (Record, Report, Codeunit, etc.)',
    example: 'Record variables first, then Report, then Codeunit, etc.'
  }
};

module.exports = { ATDDValidator, ATDD_RULES };
