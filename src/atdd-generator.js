/**
 * ATDD Test Generator
 * Generates AL test code from test plans following Ciellos ATDD guidelines
 */

class ATDDTestGenerator {

  /**
   * Parse test plan markdown and extract scenarios
   */
  parseTestPlan(markdown) {
    const scenarios = [];
    const metadata = this.extractMetadata(markdown);
    
    // Match scenario blocks
    const scenarioPattern = /###\s*\*?\*?Scenario\s+(TC?\d+)[:\s]*([^\n*]+)\*?\*?\s*([\s\S]*?)(?=###\s*\*?\*?Scenario|---|\n## |$)/gi;
    
    let match;
    while ((match = scenarioPattern.exec(markdown)) !== null) {
      const scenarioId = match[1].replace('TC', '');
      const title = match[2].trim().replace(/\*+/g, '');
      const content = match[3].trim();
      
      const scenario = {
        id: parseInt(scenarioId) || scenarios.length + 1,
        title: title,
        priority: this.extractPriority(content),
        given: this.extractSteps(content, 'Given'),
        when: this.extractSteps(content, 'When'),
        then: this.extractSteps(content, 'Then'),
        and: this.extractAndSteps(content)
      };
      
      scenarios.push(scenario);
    }
    
    return { metadata, scenarios };
  }

  /**
   * Extract metadata from test plan
   */
  extractMetadata(markdown) {
    const metadata = {
      testPlanId: '',
      workItem: '',
      project: '',
      feature: ''
    };
    
    const patterns = {
      testPlanId: /\*\*Test Plan ID\*\*:\s*([^\n]+)/i,
      workItem: /\*\*Work Item\*\*:\s*([^\n]+)/i,
      project: /\*\*Project\*\*:\s*([^\n]+)/i,
      feature: /\*\*Feature\*\*:\s*([^\n]+)/i
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern);
      if (match) {
        metadata[key] = match[1].trim();
      }
    }
    
    return metadata;
  }

  /**
   * Extract priority from scenario content
   */
  extractPriority(content) {
    const match = content.match(/\*\*Priority\*\*:\s*(\w+)/i);
    return match ? match[1] : 'Medium';
  }

  /**
   * Extract GIVEN/WHEN/THEN steps
   */
  extractSteps(content, stepType) {
    const steps = [];
    const pattern = new RegExp(`\\*\\*${stepType}\\*\\*\\s+([^\\n]+)`, 'gi');
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      steps.push(match[1].trim());
    }
    
    return steps;
  }

  /**
   * Extract AND steps with context
   */
  extractAndSteps(content) {
    const andSteps = [];
    const lines = content.split('\n');
    let lastContext = 'GIVEN';
    
    for (const line of lines) {
      if (/\*\*Given\*\*/i.test(line)) {
        lastContext = 'GIVEN';
      } else if (/\*\*When\*\*/i.test(line)) {
        lastContext = 'WHEN';
      } else if (/\*\*Then\*\*/i.test(line)) {
        lastContext = 'THEN';
      } else if (/\*\*And\*\*/i.test(line)) {
        const text = line.replace(/\*\*And\*\*/i, '').trim();
        andSteps.push({ context: lastContext, text });
      }
    }
    
    return andSteps;
  }

  /**
   * Generate AL test codeunit from parsed test plan
   */
  generateTestCodeunit(parsedPlan, options = {}) {
    const { metadata, scenarios } = parsedPlan;
    const codeunitId = options.codeunitId || 50100;
    const codeunitName = options.codeunitName || this.generateCodeunitName(metadata);
    const libraryCU = options.libraryCodeunit || 'LibraryApprovedSupplier182FDW';
    
    let code = this.generateHeader(codeunitId, codeunitName, metadata);
    code += this.generateGlobalVariables(libraryCU);
    code += this.generateInitialize();
    code += this.generateSetTestPermissions();
    
    // Generate test procedures
    for (const scenario of scenarios) {
      code += this.generateTestProcedure(scenario);
    }
    
    // Generate handler procedures
    code += this.generateHandlerProcedures(scenarios);
    
    code += '}\n';
    
    return code;
  }

  /**
   * Generate codeunit header
   */
  generateHeader(codeunitId, codeunitName, metadata) {
    const workItemId = metadata.workItem.match(/\d+/)?.[0] || '000000';
    
    return `codeunit ${codeunitId} ${codeunitName}
{
    Subtype = Test;

    trigger OnRun()
    begin
        // [FEATURE] User Story ${workItemId}: ${metadata.workItem}
    end;

`;
  }

  /**
   * Generate global variables section
   */
  generateGlobalVariables(libraryCU) {
    return `    var
        ${libraryCU}: Codeunit ${libraryCU};
        LibraryAssert: Codeunit "Library Assert";
        LibraryVariableStorage: Codeunit "Library - Variable Storage";
        LibraryLowerPermissions: Codeunit "Library - Lower Permissions";
        IsInitialized: Boolean;

`;
  }

  /**
   * Generate Initialize procedure (no comments per Ciellos rules)
   */
  generateInitialize() {
    return `    local procedure Initialize()
    begin
        SetTestPermissions();
        LibraryVariableStorage.Clear();

        if IsInitialized then
            exit;

        Commit();
        IsInitialized := true;
    end;

`;
  }

  /**
   * Generate SetTestPermissions procedure (no comments per Ciellos rules)
   */
  generateSetTestPermissions() {
    return `    local procedure SetTestPermissions()
    begin
        LibraryLowerPermissions.AddO365BusinessPremium();
    end;

`;
  }

  /**
   * Generate test procedure following Ciellos ATDD rules
   */
  generateTestProcedure(scenario) {
    const procName = this.generateProcedureName(scenario);
    const needsHandler = this.needsMessageHandler(scenario);
    
    let code = '    [Test]\n';
    if (needsHandler) {
      code += `    [HandlerFunctions('MessageHandler,ConfirmHandler')]\n`;
    }
    code += `    procedure ${procName}()\n`;
    code += '    var\n';
    code += this.generateLocalVariables(scenario);
    code += '    begin\n';
    
    // SCENARIO comment
    code += `        // [SCENARIO ${scenario.id}] ${scenario.title}\n`;
    
    // GIVEN comments and code
    for (const given of scenario.given) {
      code += `        // [GIVEN] ${given}\n`;
    }
    // Add AND steps that belong to GIVEN
    for (const andStep of scenario.and.filter(a => a.context === 'GIVEN')) {
      code += `        // [GIVEN] ${andStep.text}\n`;
    }
    code += '        Initialize();\n\n';
    
    // WHEN comments and code
    for (const when of scenario.when) {
      code += `        // [WHEN] ${when}\n`;
    }
    // Add AND steps that belong to WHEN
    for (const andStep of scenario.and.filter(a => a.context === 'WHEN')) {
      code += `        // [WHEN] ${andStep.text}\n`;
    }
    code += '        // TODO: Implement WHEN action using TestPage\n\n';
    
    // THEN comments and code
    for (const then of scenario.then) {
      code += `        // [THEN] ${then}\n`;
    }
    // Add AND steps that belong to THEN
    for (const andStep of scenario.and.filter(a => a.context === 'THEN')) {
      code += `        // [THEN] ${andStep.text}\n`;
    }
    code += '        // TODO: Implement THEN assertions using TestPage\n';
    
    code += '    end;\n\n';
    
    return code;
  }

  /**
   * Generate procedure name following T####_<Name> convention
   */
  generateProcedureName(scenario) {
    const num = scenario.id.toString().padStart(4, '0');
    const name = scenario.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
      .substring(0, 80);
    
    return `T${num}_${name}`;
  }

  /**
   * Generate local variables for test procedure
   */
  generateLocalVariables(scenario) {
    let vars = '';
    
    // Analyze scenario text to determine needed variables
    const text = [...scenario.given, ...scenario.when, ...scenario.then].join(' ');
    
    if (/requisition/i.test(text)) {
      vars += '        RequisitionLine: Record "Requisition Line";\n';
      vars += '        RequisitionWkshName: Record "Requisition Wksh. Name";\n';
    }
    if (/item/i.test(text)) {
      vars += '        Item: Record Item;\n';
    }
    if (/vendor/i.test(text)) {
      vars += '        Vendor: Record Vendor;\n';
    }
    if (/worksheet/i.test(text)) {
      vars += '        RequisitionWorksheet: TestPage "Requisition Worksheet";\n';
    }
    
    if (!vars) {
      vars = '        TempBlob: Codeunit "Temp Blob";\n';
    }
    
    return vars;
  }

  /**
   * Check if scenario needs message/confirm handlers
   */
  needsMessageHandler(scenario) {
    const text = [...scenario.given, ...scenario.when, ...scenario.then, 
                  ...scenario.and.map(a => a.text)].join(' ').toLowerCase();
    return /warning|confirmation|dialog|message|prompt/i.test(text);
  }

  /**
   * Generate handler procedures
   */
  generateHandlerProcedures(scenarios) {
    let code = '';
    
    const needsHandlers = scenarios.some(s => this.needsMessageHandler(s));
    
    if (needsHandlers) {
      code += `    [MessageHandler]
    procedure MessageHandler(Message: Text[1024])
    begin
        LibraryVariableStorage.Enqueue(Message);
    end;

    [ConfirmHandler]
    procedure ConfirmHandler(Question: Text[1024]; var Reply: Boolean)
    begin
        Reply := LibraryVariableStorage.DequeueBoolean();
    end;

`;
    }
    
    return code;
  }

  /**
   * Generate codeunit name from metadata
   */
  generateCodeunitName(metadata) {
    const workItemId = metadata.workItem.match(/\d+/)?.[0] || '000000';
    let name = metadata.workItem
      .replace(/^\d+\s*[-:]\s*/, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    
    // Ensure under 30 chars: "Tests" + name + FDW suffix
    const maxNameLen = 30 - 'Tests'.length - 'FDW'.length - 1;
    if (name.length > maxNameLen) {
      name = name.substring(0, maxNameLen);
    }
    
    return `${name}Tests182FDW`;
  }

  /**
   * Get all ATDD rules applied during generation
   */
  getAppliedRules() {
    return [
      'TEST_NAMING_PREFIX: T####_ format used for all test procedures',
      'SCENARIO_COMMENT: // [SCENARIO X] added to each test',
      'GIVEN_WHEN_THEN: All tests have [GIVEN], [WHEN], [THEN] comments',
      'AND_CONTEXT_INHERITANCE: **And** converted to inherit previous context',
      'NO_EXTRA_COMMENTS: Only structured comments in test procedures',
      'NO_COMMENTS_IN_INITIALIZE: Initialize() has no comments',
      'NO_COMMENTS_IN_SETTESTPERMISSIONS: SetTestPermissions() has no comments',
      'TESTPAGE_IN_WHEN: TODO markers added for TestPage implementation',
      'OBJECT_NAME_LENGTH: Codeunit name kept under 30 characters',
      'SCENARIO_COUNT_MATCH: One procedure per test plan scenario'
    ];
  }
}

module.exports = { ATDDTestGenerator };
