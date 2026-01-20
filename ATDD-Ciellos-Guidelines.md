ck is it a comment s test plan violation
# Aptean ATDD Guidelines for Business Central AL


---

## Introduction to ATDD

ATDD (Acceptance Test-Driven Development) promotes collaboration between stakeholders, developers, and testers to define acceptance criteria before coding begins. Acceptance tests, written from the user's perspective, serve as executable requirements to validate that the system meets the intended behavior.

Although ATDD often precedes coding, it can also verify features after development to ensure they still meet acceptance criteria and function as expected.

- Tests are implemented as AL test codeunits for business logic and user flows.
- A clear test data management strategy is essential.
- Prefer simulating UI flows using TestPage objects, with handlers for dialogs and other interactions.


## Global Variables and Declarations

- Declare supporting codeunits (e.g., library codeunits) as global in the test codeunit.
- Declare user-facing text as labels; prefer descriptive labels (more than 20 characters) for clarity and reuse.
- Keep assertion messages in labels to ensure consistency and localization readiness.

- Avoid declaring records and TestPages as global; prefer local in each test unless they are shared across many steps (avoid global mutable state in tests).
---

## Library Codeunit (Aptean Rules)

A Library codeunit encapsulates reusable, generic routines for data setup and actions:

- Scope library procedures as `Access = Internal` unless there is a clear reason otherwise.
- Library procedures should create data fully (all required dependent entities) so tests remain concise.
- Use clear naming for the function: `Create<Entity>`, `Setup<Entity>`, `Open<Entity>Page`, `Invoke<Action>`.

- Avoid hardcoded/local functions with fixed values. Prefer parameterized, reusable helpers.
- **Do not add comments in library functions** - Library procedures should be self-documenting through clear naming and parameter usage. Comments are not allowed in library codeunits to maintain clean, focused code.
- **Single responsibility principle** - Each library function should perform only one action. If it's a `Create` function, it should only create records, not modify existing ones or perform lookups. If it's a `Get` or `Find` function, it should only retrieve data, not create or modify records.
- **First parameter must be the created record** - In library create functions, the first parameter must be the record variable (passed by `var`) that will be created and returned to the caller.
- **Create records with all meaningful fields** - When creating records in library functions, populate all relevant fields that would typically be filled by users, not just the minimum required fields. This ensures realistic test data and prevents issues with incomplete records.
- **Use library methods instead of repetitive inline code** - Create dedicated helper methods like `CreateItemWithBaseUOM()` rather than repeating `Get()`, `Validate()`, `Modify()` patterns for each item creation. This reduces code duplication and improves maintainability.
- **Insert operations only in library functions** - All record insert operations should be performed in library functions, never directly in test scenarios. Test scenarios should only call library methods to create data, maintaining clean separation of concerns.
- **Search existing library codeunits before creating new ones** - Before creating a new generic library codeunit, search existing library codeunits to see if there's already a generic codeunit that can be used or extended for your use case. Avoid duplicating functionality across multiple library codeunits.

### ❌ WRONG - Repetitive inline code in test scenarios:
```al
// [GIVEN] Item with No = "001"; Base Unit of Measure = Tablet
ItemNo[1] := LibraryInventory.CreateItemNo();
Item[1].Get(ItemNo[1]);
Item[1].Validate("Base Unit of Measure", 'TABLET');
Item[1].Modify(true);

// [GIVEN] Item with No = "002"; Base Unit of Measure = MG
ItemNo[2] := LibraryInventory.CreateItemNo();
Item[2].Get(ItemNo[2]);
Item[2].Validate("Base Unit of Measure", 'MG');
Item[2].Modify(true);

// [GIVEN] Item with No = "003"; Base Unit of Measure = MG
ItemNo[3] := LibraryInventory.CreateItemNo();
Item[3].Get(ItemNo[3]);
Item[3].Validate("Base Unit of Measure", 'MG');
Item[3].Modify(true);

// [GIVEN] Item with No = "004"; Base Unit of Measure = MG
ItemNo[4] := LibraryInventory.CreateItemNo();
Item[4].Get(ItemNo[4]);
Item[4].Validate("Base Unit of Measure", 'MG');
Item[4].Modify(true);
```

### ✅ CORRECT - Use library helper methods:
```al
// [GIVEN] Item with No = "001"; Base Unit of Measure = Tablet
ItemNo[1] := LibraryProductionBOM16FDW.CreateItemWithBaseUOM(Item[1], 'TABLET');

// [GIVEN] Item with No = "002"; Base Unit of Measure = MG
ItemNo[2] := LibraryProductionBOM16FDW.CreateItemWithBaseUOM(Item[2], 'MG');

// [GIVEN] Item with No = "003"; Base Unit of Measure = MG
ItemNo[3] := LibraryProductionBOM16FDW.CreateItemWithBaseUOM(Item[3], 'MG');

// [GIVEN] Item with No = "004"; Base Unit of Measure = MG
ItemNo[4] := LibraryProductionBOM16FDW.CreateItemWithBaseUOM(Item[4], 'MG');
```

Example (excerpt):

```al
codeunit 72947622 LibraryReportDesign202FDW
{
    Access = Internal;

    procedure CreateTestReportDesign(var ReportDesign: Record ReportDesign202FDW; ReportDesignCode: Code[20]; Description: Text[100]; ReportID: Integer; ReportName: Text[100])
    begin
        ReportDesign.Init();
        ReportDesign.Validate(Code, ReportDesignCode);
        ReportDesign.Validate(Description, Description);
        ReportDesign.Validate("Report ID", ReportID);
        ReportDesign.Validate("Report Name", ReportName);
        ReportDesign.Insert(true);
    end;
}
## Initialize() Pattern

The `Initialize()` procedure standardizes permissions, cleanup, and one-time setup.

- Always call `SetTestPermissions()` at the start of each test run.
- Guard one-time setup with `IsInitialized` to avoid recreating static data for each test.
- Clear `Library - Variable Storage` to reset handler state.
- If multiple tests share the same base records, create them in `Initialize()` and only fetch them in tests.

Example pattern:
```al
local procedure Initialize()
var
    ReportDesign: Record ReportDesign202FDW;
begin
    SetTestPermissions();              // runs for every test
    LibraryReportDesign202FDW.CleanupTestData(TestReportCodeTxt);
    SetupReportDesignTablesUsed();     // mandatory scenario setup

    if IsInitialized then
        exit;                          // one-time setup guard

    LibraryVariableStorage.Clear();

    LibraryReportDesign202FDW.CreateTestReportDesign(
        ReportDesign,
        TestReportCodeTxt,
        'My Test Report',
        50000,
        'Test Report Name');

    Commit();
    IsInitialized := true;
end;
```



---

## Writing Tests: Naming and Structure

- Use `Subtype = Test` in the codeunit.
- Procedure names follow PascalCase and begin with the test scenario number, under 120 characters.
- **Naming Convention**: Avoid names with quotation marks (""); use PascalCase without spaces and end with [XXX]FDW format (e.g., BOMVersionTests16FDW instead of "ATDD 330789 BOM Version Tests").
- Use the GIVEN–WHEN–THEN comment convention. ALL comments must start with `// [SCENARIO X]`, `// [GIVEN]`, `// [WHEN]`, or `// [THEN]`. No extra comments are allowed. No comments in var sections, Initialize procedures, or SetTestPermissions procedures.
- Keep records and TestPages local within the test.
- Keep labels global for reuse.
- Prefer library helpers to create data; avoid duplicating setup code across tests.

Example shell:

```al
[Test]
procedure T0003_ValidationErrorsForIncompatibleFieldFormats()
begin
    // [SCENARIO 3] Validation Errors for Incompatible Field Formats
    // [GIVEN] Base setup exists and a report design has multiple tables
    Initialize();

    // [WHEN] User attempts an incompatible action on a TestPage

    // [THEN] Appropriate error is raised and asserted
end;
```

## GIVEN – WHEN – THEN

- **[GIVEN]** Describe and create initial conditions. Use library codeunits and create all required related data. Avoid relying on existing environment data. In GIVEN sections, use record operations to create everything; avoid TestPages. TestPages are mandatory only in WHEN sections.
- **[WHEN]** Simulate the user action. **MUST use TestPage interactions** to simulate real user behavior; if the action opens a dialog/page, add appropriate handler functions.
- **[THEN]** Validate results using `Library Assert` (or `Assert`). Ensure checks are specific, deterministic, and meaningful to the business rule.

Examples:

```al
// [GIVEN] Customer exists with Location = 'Green'
LibraryWarehouse.CreateLocation(Location);
LibrarySales.CreateCustomerWithLocationCode(Customer, Location.Code);

// [WHEN] Increase Sales Order line quantity by +1
IncreaseSalesLineQuantityInSalesOrder(SalesHeader, SalesLine, 1);

// [THEN] Line quantity increased accordingly
Assert.IsTrue(SalesLine.Quantity = (QtyItemA + 1));
```

---

## Handler Functions

Handlers simulate user responses and validate UI messages during TestPage interactions. Place them at the end of the codeunit and reference them with `[HandlerFunctions('...')]` on the test.

Aptean guidance:
- Drive handler behavior using `Library - Variable Storage` to branch scenarios without duplicating tests.
- Keep assertions close to the behavior being simulated to make failures actionable.
- Handler functions should be placed at the end of the codeunit.


Common handlers:

- `[MessageHandler]` – Capture and validate informational messages.
- `[ConfirmHandler]` – Intercept confirm dialogs and set `Reply` true/false.
- `[PageHandler]` – Handle non-modal page openings.
- `[ModalPageHandler]` – Interact with modal pages (set values, press OK/Cancel).

Example:

```al
[ConfirmHandler]
procedure ConfirmHandlerYes(Question: Text[1024]; var Reply: Boolean)
begin
    LibraryAssert.AreEqual(NoTablesSelectedQst, Question);
    Reply := true;
end;

[ModalPageHandler]
procedure TableSelectionDialogHandler(var TableSelectionDialog: TestPage TableSelectionDialog202FDW)
begin
    // Simulate selection or verify state, then OK
    TableSelectionDialog.OK().Invoke();
end;

[MessageHandler]
procedure MessageHandler(Message: Text[1024])
begin
    LibraryAssert.AreEqual(NoTablesSelectedMsg, Message);
end;
```

---

## Error Handling and ASSERTERROR

Use `ASSERTERROR` to verify expected failures:

Aptean guidance:
- Test both positive and negative paths.
- Ensure error text assertions are stable (use labels, avoid brittle string fragments when possible).

```al
[Test]
procedure Test_ExpectedError()
var
    ExpectedErrorLbl: Label 'An expected error';
begin
    asserterror Error(ExpectedErrorLbl);
    LibraryAssert.ExpectedError(ExpectedErrorLbl);
end;
```


---

## Dependencies and Environments

- Add Microsoft test libraries (e.g., `Tests-TestLibraries`) to leverage existing helpers and reduce duplication.
- Choose the right app (Test App vs. Integration Test App) to satisfy dependencies.
- Prefer container-based environments for deterministic runs.
- Generate all required data during tests; do not rely on existing tenant data.

---

## Best Practices (Aptean Additions)

- Keep tests independent and idempotent; they must not rely on each other's side effects.
- Avoid random values unless explicitly necessary—if used, record them and assert deterministically.
- Use consistent naming: `T####_<ShortScenarioName>`.
- **Naming Convention**: Avoid names with quotation marks (""); use PascalCase without spaces and end with [XXX]FDW format (e.g., BOMVersionTests16FDW instead of "ATDD 330789 BOM Version Tests").
- Keep each test focused on one user action in the WHEN step; use multiple tests for variants.
- Avoid `Commit()` statements in test procedures; only use `Commit()` in `Initialize()` procedures when necessary for one-time setup.
- Cleanup by key or prefix to avoid deleting unrelated data.
- Maintain test data codes (e.g., report codes) as labels/constants for easy reuse.
- Prefer enums and option members over magic numbers/strings.
- **ALL `// [WHEN]` sections MUST use TestPage actions** - Never use direct record operations in WHEN clauses; always simulate user interactions through TestPage objects.
- Keep page interaction minimal and purposeful; prefer direct record operations when UI isn't the purpose of the test.
- Document tricky preconditions using GIVEN/WHEN/THEN comment format and link to library helpers.

---

## Test Results and Reporting
{{ ... }}

- Use the AL Test Tool to run all or selected tests.
- Group tests by feature for targeted execution.
- Ensure failure messages are clear and guide the developer to the root cause.

---

## Full Example Skeleton

```al
codeunit 50100 ATDD_Skeleton
{
    Subtype = Test;

    var
        LibrarySales: Codeunit "Library - Sales";
        LibraryWarehouse: Codeunit "Library - Warehouse";
        LibraryAssert: Codeunit "Library Assert";
        LibraryVariableStorage: Codeunit "Library - Variable Storage";
        ErrorMsg: Label 'Wrong line Quantity. Should be %1, Is %2', Comment = '%1 = Original Quantity, %2 = Increased Quantity';
        IsInitialized: Boolean;

    local procedure Initialize()
    begin
        // permissions, cleanup, one-time base data
    end;

    [Test]
    [HandlerFunctions('MessageWarehouseShip,WarehouseShipConfirmHandler,WarehouseShipPageHandler')]
    procedure T0001_VerifySalesLineQtyAfterIncrease()
    var
        ItemA: Record Item;
        SalesHeader: Record "Sales Header";
        SalesLine: Record "Sales Line";
        Customer: Record Customer;
        Location: Record Location;
        QtyItemA, QtyIncrease: Integer;
    begin
        // [SCENARIO 1] Increasing sales line quantity updates totals
        // [GIVEN]
        Initialize();
        LibraryWarehouse.CreateLocation(Location);
        LibrarySales.CreateCustomerWithLocationCode(Customer, Location.Code);
        LibrarySales.CreateSalesHeader(SalesHeader, SalesHeader."Document Type"::Order, Customer."No.");
        LibrarySales.CreateSalesLine(SalesLine, SalesHeader, SalesLine.Type::Item, ItemA."No.", QtyItemA);

        // [WHEN]
        QtyIncrease := 1;
        IncreaseSalesLineQuantityInSalesOrder(SalesHeader, SalesLine, QtyIncrease);

        // [THEN]
        LibraryAssert.IsTrue((SalesLine.Quantity = (QtyItemA + QtyIncrease)), ErrorMsg);
    end;
}
```

---

## AL Coding Style Essentials for Unit Tests (from ms_al_best_practices)

- **File/Object Naming**
  - Include the object name and type in the filename: e.g., `MyFeatureTests.Codeunit.al`.
  - Use recommended type suffixes (e.g., `Codeunit`, `Page`, `Enum`).
  - Keep object names prefixed consistently for discoverability.

- **Formatting**
  - Keywords lowercase, 4-space indentation, braces on new lines.
  - Keep lines readable; avoid overly long statements.

- **Variable and Field Naming**
  - Use PascalCase; prefix temporary records with `Temp` (e.g., `TempCustomer`).
  - Avoid wildcard characters in names; prefer plain A–Z, a–z, 0–9.

- **Method Declaration and Calls**
  - PascalCase procedure names; space after semicolons in parameter lists.
  - Blank line between procedures; always include parentheses on calls (e.g., `Init()`).

- **File Structure Inside Objects**
  - Properties → Object constructs (layout/actions) → Globals (labels/vars) → Methods.

- **Copilot/Action Names**
  - Avoid trailing spaces in action names (affects Copilot recognition).

---

## Additional QA Rules (from Testing-QualityAssurance.md)

- **Unit Testing Checklist**
  - Test codeunits exist for critical business logic; edge/boundary cases covered.
  - Follow `T<ScenarioNumber>_<TestTitleNoSpaces>` naming format and GIVEN/WHEN/THEN comments from the test plan.
  - Use `Assert` methods and `asserterror` for expected failures; never custom ad-hoc validations.
  - Maintain a test data strategy; never rely on tenant data.

- **Standardized Test Codeunit Structure**
  - Include `[FEATURE] User Story <ID>: <Description>` in `OnRun()` for traceability.
  - Globals: library codeunits, labels, `IsInitialized`, and other shared vars.
  - `Initialize()`: permissions, clear variable storage, one-time setup guarded by `IsInitialized`.
  - `SetTestPermissions()`: use `Library - Lower Permissions` and app-specific `LibraryTestPermissions`.

- **WHEN Clause via Page Interactions**
  - Drive modal/confirm/message flows with handlers: `[ModalPageHandler]`, `[PageHandler]`, `[ConfirmHandler]`, `[MessageHandler]`, `[StrMenuHandler]`, `[RequestPageHandler]`.
  - Use `Library - Variable Storage` to pass context into handlers.
  - Avoid calling tables/codeunits/reports directly for user-facing behavior.

- **AL Test Assertions**
  - Use `Assert.AreEqual/AreNotEqual/IsTrue/IsFalse` consistently with meaningful messages.
  - Use labels for assertion text to avoid brittle strings and to support localization.
  - ALL Assert methods must use labels for message text, never hardcoded strings.
  - When testing UI behavior, prefer TestPage assertions over direct record assertions to validate what the user actually sees.

**Avoid (hardcoded strings):**
```al
LibraryAssert.ExpectedError('Only one version can be certified at a time for this product');
LibraryAssert.AreEqual(Enum::"BOM Status"::Certified.AsInteger(), FormulationVersion.Status.AsInteger(), 'Version FORM000001 should remain Certified');
```

**Prefer (labels):**
```al
LibraryAssert.ExpectedError(OnlyOneVersionCertifiedErr);
LibraryAssert.AreEqual(Enum::"BOM Status"::Certified.AsInteger(), FormulationVersion.Status.AsInteger(), StrSubstNo(VersionShouldRemainCertifiedLbl, 'FORM000001'));
```

**Avoid (direct record assertion when testing UI):**
```al
FormulationVersion.Get('FORM1', 'FORM000002');
LibraryAssert.AreEqual(Enum::"BOM Status"::Certified.AsInteger(), FormulationVersion.Status.AsInteger(), StrSubstNo(ActiveVersionShouldSwitchLbl, 'FORM000002'));
```

**Prefer (TestPage assertion when testing UI):**
```al
FormVersionCard.GoToRecord(FormulationVersion);
LibraryAssert.AreEqual(Enum::"BOM Status"::Certified.AsInteger(), FormVersionCard.Status.AsInteger(), StrSubstNo(ActiveVersionShouldSwitchLbl, 'FORM000002'));
```

- **Test Library Design**
  - Centralize common helpers; standardize data creation; ensure isolation between tests.
  - Prefer extending existing libraries before creating new ones; keep them in `src/codeunit/`.
  - Provide setup/teardown routines and cleanup-by-key helpers.

- **Test Data Strategy**
  - Independent setup per test; realistic volumes; cleanup after execution.
  - Handle sensitive data appropriately in non-prod environments.

- **Environment & Suite Management**
  - Test in container-based environments mirroring production settings.
  - Document refresh procedures and database state management.
  - Organize tests by feature/module; minimize dependencies; optimize execution order.

- **CI/CD & Regression**
  - Run tests on code changes; failures must block promotion.
  - Maintain automated regression suites focusing on critical flows and integration points.
  - Track performance regressions and surface results into dev workflow.

- **Performance & Security (high level)**
  - Establish response-time and throughput thresholds; validate UI responsiveness.
  - Validate permissions and data access control; test with least privilege.


- **Permission Testing**
  - Ensure flows work without SUPER; test with minimal permission sets via `SetTestPermissions()`.
  - Use `LibraryLowerPermissions.AddO365BusinessPremium()` + app-specific `LibraryTestPermissions`.

---

---

## Additional AL Coding Guidelines

### Variable Declaration Rules

Variable declarations should be ordered by type. Variables should be sorted in the following order:

1. **Record**
2. **Report**
3. **Codeunit**
4. **XmlPort**
5. **Page**
6. **Query**
7. **Notification**
8. **BigText**
9. **DateFormula**
10. **RecordId**
11. **RecordRef**
12. **FieldRef**
13. **FilterPageBuilder**

The rest of the variables are not sorted and can be declared in any order after the above types.

### Variable Naming Rules

#### Record Variable Naming
When declaring Record variables, use descriptive names that clearly indicate the purpose or entity type rather than generic names.

**Avoid:**
```al
Line: Record "Formulation Line 199FDW";
```

**Prefer:**
```al
FormulationLine: Record "Formulation Line 199FDW";
```

This makes the code more readable and self-documenting, especially when multiple record types are used in the same procedure.

### Variable Usage Rules

#### Use Arrays for Similar Variables

When declaring multiple variables of the same record type, use arrays instead of individual variables.

**Avoid:**
```al
CustomerNameField: Record ReportDesignTableField202FDW;
CustomerCreditLimitField: Record ReportDesignTableField202FDW;
SalesHeaderOrderDateField: Record ReportDesignTableField202FDW;
CustomerAllowLineDiscField: Record ReportDesignTableField202FDW;
```

**Prefer:**
```al
ReportDesignTableField: array[4] of Record ReportDesignTableField202FDW;
```

#### Example of Correct Variable Declaration Order

```al
procedure ExampleProcedure()
var
    Customer: Record Customer;
    SalesHeader: Record "Sales Header";
    CustomerReport: Report "Customer - List";
    LibrarySales: Codeunit "Library - Sales";
    NoSeriesManagement: Codeunit NoSeriesManagement;
    CustomerXmlPort: XmlPort "Customer Import";
    CustomerCard: Page "Customer Card";
    CustomerQuery: Query "Customer Sales";
    MyNotification: Notification;
    LargeText: BigText;
    DateFormulaVar: DateFormula;
    CustomerRecordId: RecordId;
    CustomerRecordRef: RecordRef;
    CustomerFieldRef: FieldRef;
    FilterBuilder: FilterPageBuilder;
    CustomerNo: Code[20];
    Amount: Decimal;
    IsInitialized: Boolean;
    Counter: Integer;
    Description: Text[100];
begin
end;
```

### Object Identifier Length Rules

Application object identifiers in AL must not exceed the maximum allowed length. Business Central enforces strict length limits for object names to ensure compatibility and consistency.

**Maximum Length Limits:**
- **All AL Objects**: 30 characters maximum
- This includes: Tables, Codeunits, Pages, Reports, XMLports, Queries, Enums, and all other object types

**Avoid:**
```al
codeunit 50101 ThisIsAVeryLongCodeunitNameThatWillCauseCompilationErrors
{
    // ❌ Codeunit name exceeds 30 characters
}
```

**Prefer:**
```al
codeunit 50101 FormulationMgmt199FDW
{
    // ✅ Codeunit name is within 30 characters (23 characters)
}
```

**Additional Examples:**
```al
// ❌ Too long (45 characters)
table 50100 FormulationVersionDetailsWithExtendedInformation

// ✅ Within limit (28 characters)  
table 50100 "Formulation Version Details"

// ❌ Too long (38 characters)
page 50102 FormulationManagementAdministrationPage

// ✅ Within limit (21 characters)
page 50102 FormulationAdminPage
```

**Critical Guidelines:**
- Count every character including spaces and punctuation
- Object names are case-insensitive but length limits apply regardless
- Exceeding limits causes compilation failures
- Use strategic abbreviations (e.g., "Mgmt." for "Management", "Admin." for "Administration")
- Prioritize clarity over brevity, but stay within limits
- Consider using company/app prefixes for namespacing when appropriate

---

## Writing Tests: Naming and Structure

#### Comment Rules for Test Scenarios

- **ALL comments rule**: In the entire document, no extra comments are allowed. ALL comments must start with `// [SCENARIO X]`, `// [GIVEN]`, `// [WHEN]`, or `// [THEN]`
- **Scenario comments**: Use `// [SCENARIO 1]`, `// [SCENARIO 2]`, `// [SCENARIO 3]` format (not `### Scenario 1`)
- **Given comments**: Use `// [GIVEN]` format (not **Given**)
- **When comments**: Use `// [WHEN]` format (not **When**)
- **Then comments**: Use `// [THEN]` format (not **Then**)
- **Required structure**: All scenarios must have at least 1 `// [GIVEN]`, `// [WHEN]` and `// [THEN]`
- **No comments in**: var sections, Initialize procedures, or SetTestPermissions procedures
- **TestPage usage**: `// [WHEN]` **MUST** be followed by TestPage actions to simulate user behavior, and this TestPage will be validated after in the `// [THEN]`
- **TestPage efficiency**: Avoid unnecessary opening and closing of the same page; open once at the beginning and close once at the end
- **Button handling**: If the test scenario involves selecting buttons (e.g., 'Versions' and 'New' on Formulation Versions list page), must select by invoke and handle it by the handler function
- **Line spacing**: Comment should be followed by the line action, then give a space before the next comment

#### Example of Enhanced Test Scenario Format

```al
[Test]
[HandlerFunctions('FormulationVersionsPageHandler')]
procedure T0001_ValidateCustomerCreation()
var
    CustomerCard: TestPage "Customer Card";
begin
    // [SCENARIO 1] Customer creation with valid data
    // [GIVEN] Valid customer data is prepared
    Initialize();
    PrepareCustomerData();

    // [WHEN] Customer is created through the page
    CustomerCard.OpenNew();
    CustomerCard.Name.SetValue('Test Customer');
    CustomerCard.Versions.Invoke();

    // [THEN] Customer is successfully created and saved
    CustomerCard.Name.AssertEquals('Test Customer');
    VerifyCustomerExists();
end;

[PageHandler]
procedure FormulationVersionsPageHandler(var FormulationVersionsList: TestPage "Formulation Versions List")
begin
    FormulationVersionsList.New.Invoke();
end;
```

### Test Permissions Rules

#### Forbidden: TestPermissions = Disabled

Do not use the `TestPermissions = Disabled;` property in test codeunits. This can lead to insufficient permission testing and potential security issues.

**Avoid:**
```al
codeunit 50100 MyTestCodeunit
{
    Subtype = Test;
    TestPermissions = Disabled;
    // ...
}
```

**Prefer:**
Instead, implement a local `SetTestPermissions()` procedure in your test codeunit and call it at the beginning of the `Initialize()` method:

```al
local procedure SetTestPermissions()
var
    LibraryLowerPermissions: Codeunit "Library - Lower Permissions";
    LibraryTestPermissions: Codeunit LibraryTestPermissions199FDW;
begin
    LibraryLowerPermissions.AddO365BusinessPremium();
    LibraryTestPermissions.SetTestPermissions();
end;
```

This ensures proper permission testing with minimal required permissions and follows Aptean security guidelines.

#### Forbidden: Commit() in Test Procedures

Do not use `Commit();` statements in test procedures. Test procedures should not commit transactions as this can interfere with test isolation and rollback behavior.

**Avoid:**
```al
[Test]
procedure T0001_MyTest()
begin
    // [SCENARIO 1] Test scenario
    Initialize();
    
    // Test logic here
    // ...
    
    Commit();  // ❌ Do not use in test procedures
end;
```

**Prefer:**
Test procedures should rely on the automatic rollback that occurs after each test completes. If you need to commit data for testing purposes, do so only in the `Initialize()` procedure for one-time setup data.

```al
local procedure Initialize()
begin
    SetTestPermissions();
    LibraryReportDesign202FDW.CleanupTestData(TestReportCodeTxt);
    SetupReportDesignTablesUsed();
    
    if IsInitialized then
        exit;
    
    LibraryVariableStorage.Clear();
    
    // One-time setup that requires commit
    LibraryReportDesign202FDW.CreateTestReportDesign(ReportDesign, TestReportCodeTxt, 'My Test Report', 50000, 'Test Report Name');
    Commit();  // ✅ Only allowed in Initialize() for one-time setup
    
    IsInitialized := true;
end;
```

Using `Commit();` inappropriately can cause test failures, data inconsistencies between tests, and make debugging more difficult.

#### Forbidden: Extra Comments in Test Code

Do not add extra comments beyond the required GIVEN-WHEN-THEN structure. All comments in test procedures must follow the strict format: `// [SCENARIO X]`, `// [GIVEN]`, `// [WHEN]`, or `// [THEN]`. No additional explanatory comments are allowed.

**Avoid:**
```al
[Test]
procedure T0001_MyTest()
begin
    // [SCENARIO 1] Customer creation test
    Initialize();  // Initialize test data ❌
    
    // [GIVEN] Setup completed
    // Create customer record  // ❌ Extra comment
    LibrarySales.CreateCustomer(Customer);
    
    // [WHEN] User creates customer
    CustomerCard.OpenNew();
    CustomerCard.Name.SetValue('Test Customer');  // Set customer name ❌
    
    // [THEN] Customer should be created
    CustomerCard.Name.AssertEquals('Test Customer');  // Verify name ❌
end;
```

**Prefer:**
```al
[Test]
procedure T0001_MyTest()
begin
    // [SCENARIO 1] Customer creation test
    Initialize();
    
    // [GIVEN] Customer data is prepared
    LibrarySales.CreateCustomer(Customer);
    
    // [WHEN] Customer is created through the page
    CustomerCard.OpenNew();
    CustomerCard.Name.SetValue('Test Customer');
    
    // [THEN] Customer is successfully created
    CustomerCard.Name.AssertEquals('Test Customer');
end;
```

**Strict Rules:**
- No comments in `var` sections
- No comments in `Initialize()` procedures
- No comments in `SetTestPermissions()` procedures
- No explanatory comments alongside code lines
- Only the four allowed comment types: `// [SCENARIO X]`, `// [GIVEN]`, `// [WHEN]`, `// [THEN]`
- Each test must have exactly one `// [SCENARIO X]` comment followed by `// [GIVEN]`, `// [WHEN]`, and `// [THEN]` comments

This strict commenting discipline ensures consistency, readability, and maintainability across all Aptean test code.

#### **CRITICAL RULE: Never Change Test Scenarios**

**MANDATORY - VERY IMPORTANT**: Test scenarios must never be changed from their original test plan specification. Both the procedure number and scenario comment must match the original test plan scenario number.

**Forbidden Actions:**
- ❌ **Never change** scenario numbers in comments to match procedure numbers
- ❌ **Never update** scenario descriptions when procedure numbers change
- ❌ **Never modify** the original scenario text from the test plan

**Required Actions:**
- ✅ **Preserve** original scenario descriptions exactly as written in the test plan
- ✅ **Keep** scenario numbers in comments unchanged from the original test plan
- ✅ **Maintain** consistency with the original test scenario specification

**Example of WRONG Implementation:**
```al
// If test plan has: ### Scenario 3: Single Quote Instead of Double Quote

// Original test scenario:
procedure T0003_SingleQuoteInsteadOfDoubleQuote()
begin
    // [SCENARIO 3] Single Quote Instead of Double Quote
end;

// ❌ WRONG - Changed scenario number in comment to match procedure:
[Test]
procedure T0006_SingleQuoteInsteadOfDoubleQuote()
begin
    // [SCENARIO 6] Single Quote Instead of Double Quote
end;
```

**Example of CORRECT Implementation:**
```al
// If test plan has: ### Scenario 3: Single Quote Instead of Double Quote

// ✅ CORRECT - Both procedure number and scenario comment match the test plan:
[Test]
procedure T0003_SingleQuoteInsteadOfDoubleQuote()
begin
    // [SCENARIO 3] Single Quote Instead of Double Quote
end;
```

**Enforcement Rules:**
- Both **procedure number** and **scenario comment** must match the original test plan
- If test plan has "### Scenario 3", then use T0003 procedure and // [SCENARIO 3] comment
- **Never change** either the procedure number or scenario comment from the test plan specification
- **Traceability** to the original test plan must be maintained through exact matching of scenario numbers

#### **CRITICAL RULE: All Test Plan Scenarios Must Be Implemented**

**MANDATORY - VERY IMPORTANT**: Every scenario defined in the test plan must have a corresponding test procedure implemented. No test plan scenarios can be skipped or omitted.

**Required Actions:**
- ✅ **Create** a test procedure for every scenario in the test plan
- ✅ **Implement** all scenarios regardless of complexity or perceived importance
- ✅ **Maintain** 1:1 correspondence between test plan scenarios and test procedures
- ✅ **Verify** that the total number of test procedures matches the total number of test plan scenarios

**Forbidden Actions:**
- ❌ **Never skip** implementing any test plan scenario
- ❌ **Never combine** multiple test plan scenarios into a single test procedure
- ❌ **Never omit** scenarios deemed "less important" or "obvious"

#### **CRITICAL RULE: Exact Scenario Count Matching**

**MANDATORY - VERY IMPORTANT**: The number of implemented test procedures must exactly match the number of scenarios defined in the test plan. This is a critical validation rule that ensures complete test coverage.

**Scenario Count Rules:**
- ✅ **If test plan has 10 scenarios** → Must implement exactly 10 test procedures (T0001 through T0010)
- ✅ **If test plan has 5 scenarios** → Must implement exactly 5 test procedures (T0001 through T0005)
- ✅ **If test plan has 15 scenarios** → Must implement exactly 15 test procedures (T0001 through T0015)
- ✅ **Any number N scenarios** → Must implement exactly N test procedures (T0001 through T000N)

**Validation Requirements:**
- ✅ **Count verification**: Total test procedures = Total test plan scenarios
- ✅ **Sequential numbering**: Test procedures must be numbered sequentially starting from T0001
- ✅ **No gaps allowed**: Cannot skip procedure numbers (e.g., T0001, T0002, T0004 is invalid)
- ✅ **No duplicates allowed**: Each scenario number can only be used once

**Critical Enforcement:**
- ❌ **10 scenarios in test plan but only 8 procedures implemented** → INVALID
- ❌ **5 scenarios in test plan but 7 procedures implemented** → INVALID  
- ❌ **Missing procedure numbers** (e.g., T0001, T0003, T0004 when should be T0001, T0002, T0003) → INVALID
- ❌ **Extra procedures beyond scenario count** → INVALID

**Quality Gate:**
This rule serves as a critical quality gate to ensure:
- **Complete coverage**: No test scenarios are accidentally omitted
- **Traceability**: Perfect 1:1 mapping between test plan and implementation
- **Consistency**: Standardized approach across all test implementations

**Example:**
```al
// If test plan has:
// ### Scenario 1: Valid Data Entry
// ### Scenario 2: Invalid Field Format
// ### Scenario 3: Single Quote Instead of Double Quote
// ### Scenario 4: Missing Required Fields
// ### Scenario 5: Boundary Value Testing
// ### Scenario 6: Special Characters Handling
// ### Scenario 7: Maximum Length Validation
// ### Scenario 8: Duplicate Entry Prevention
// ### Scenario 9: Case Sensitivity Testing
// ### Scenario 10: Performance Under Load

// Then you MUST implement ALL 10 test procedures:
[Test] procedure T0001_ValidDataEntry()
[Test] procedure T0002_InvalidFieldFormat()
[Test] procedure T0003_SingleQuoteInsteadOfDoubleQuote()
[Test] procedure T0004_MissingRequiredFields()
[Test] procedure T0005_BoundaryValueTesting()
[Test] procedure T0006_SpecialCharactersHandling()
[Test] procedure T0007_MaximumLengthValidation()
[Test] procedure T0008_DuplicateEntryPrevention()
[Test] procedure T0009_CaseSensitivityTesting()
[Test] procedure T0010_PerformanceUnderLoad()
```

**Enforcement Rules:**
- **Complete coverage** of all test plan scenarios is mandatory
- **Quality assurance** reviews must verify 1:1 scenario-to-procedure mapping
- **Test execution** must include all implemented scenarios
- **Documentation** must reflect the complete implementation status

#### **CRITICAL RULE: Test Plan Comments Must Be Exactly Equal - No Additions or Removals**

**MANDATORY - VERY IMPORTANT**: Test plan text in comments must be copied exactly line by line from the original test plan. Comments must be **EXACTLY EQUAL** to the test plan with **ZERO TOLERANCE** for any changes, additions, or removals.

**ABSOLUTE FORBIDDEN ACTIONS:**
- ❌ **Never change** any word, phrase, or sentence from the original test plan
- ❌ **Never aggregate** multiple test plan lines into a single comment
- ❌ **Never split** a single test plan line into multiple comments
- ❌ **Never paraphrase** or rewrite test plan text in your own words
- ❌ **Never update** comments to match different implementation results
- ❌ **Never add** explanatory text to test plan comments
- ❌ **Never remove** any part of the original test plan text
- ❌ **Never add** extra words, phrases, or clarifications
- ❌ **Never remove** words, phrases, or details from the original
- ❌ **Never modify** punctuation, capitalization, or formatting
- ❌ **Never insert** additional context or background information
- ❌ **Never delete** any portion of the test plan specification

**MANDATORY EQUAL REQUIREMENTS:**
- ✅ **Copy exactly** each line from the test plan as a separate comment
- ✅ **Preserve** all original punctuation, capitalization, and formatting
- ✅ **Maintain** the exact sequence and structure from the test plan
- ✅ **Use** the original test plan as the single source of truth
- ✅ **Ensure 100% character-by-character match** between test plan and comments
- ✅ **Verify identical word count** in each comment line
- ✅ **Maintain exact spacing** and indentation from original
- ✅ **Keep identical quotation marks** and special characters

**Example of WRONG Implementation:**
```al
// Original test plan has 3 separate lines:
// Line 1: Setup exists with Customer "CUST001"
// Line 2: Customer has Credit Limit = 1000
// Line 3: Customer has Payment Terms = "30 Days"

// ❌ WRONG - Aggregated into single comment:
// [GIVEN] Customer CUST001 exists with Credit Limit 1000 and Payment Terms 30 Days

// ❌ WRONG - Modified text:
// [GIVEN] Customer setup is completed with proper configuration
```

**Example of CORRECT Implementation:**
```al
// ✅ CORRECT - Each line copied exactly:
// [GIVEN] Setup exists with Customer "CUST001"
// [GIVEN] Customer has Credit Limit = 1000  
// [GIVEN] Customer has Payment Terms = "30 Days"
```

**Additional Examples:**

**Wrong - Text Modification:**
```al
// Original: Setup exists for "Allergens" attribute with Method = "Concatenate Unique"
// [GIVEN] Aggregation Setup for "Allergens" attribute has Method = "LogicalOR" ❌ ERROR
```

**Correct - Exact Copy:**
```al
// Original: Setup exists for "Allergens" attribute with Method = "Concatenate Unique"
// [GIVEN] Setup exists for "Allergens" attribute with Method = "Concatenate Unique" ✅ CORRECT
```

**Enforcement Rules:**
- If implementation differs from the test plan, **fix the implementation**, not the comments
- Test plan comments serve as the **immutable specification**
- Any discrepancy between comments and implementation indicates a **bug in the code**
- Comments must **never be updated** to match incorrect implementation behavior
- Each test plan line must have its **own separate comment** - no combining or splitting allowed

**Quality Assurance:**
- During code reviews, verify that every GIVEN/WHEN/THEN comment matches the original test plan exactly
- Use diff tools to compare test plan text with comment text to ensure 100% accuracy
- Reject any pull request that modifies test plan text in comments
- Maintain audit trails by preserving original test plan specifications

**EQUALITY VALIDATION PROCESS:**
- ✅ **Character-by-character comparison**: Every character in comments must match test plan exactly
- ✅ **Word count verification**: Count words in test plan vs comments - must be identical
- ✅ **Punctuation check**: Every comma, period, quote, bracket must be preserved exactly
- ✅ **Spacing validation**: Verify identical spacing between words and around punctuation
- ✅ **Case sensitivity**: Uppercase/lowercase must match exactly as in test plan
- ✅ **Special characters**: All symbols, numbers, and special characters must be identical
- ✅ **Line-by-line audit**: Each test plan line must have exactly one matching comment line

**ZERO TOLERANCE POLICY:**
- **No additions allowed**: Cannot add even a single word, character, or space
- **No removals allowed**: Cannot remove even a single word, character, or space
- **No modifications allowed**: Cannot change even a single character or punctuation mark
- **Perfect equality required**: Comments must be 100% identical to test plan text

This rule ensures complete traceability between test plans and implementation, maintains specification integrity, and prevents requirement drift during development.

#### **CRITICAL RULE: Test Plan Dash Formatting**

**MANDATORY - VERY IMPORTANT**: When test plans contain dashes (-) for sub-items or details, these can be formatted on the same line in AL comments rather than creating separate comment lines for each dash item.

**Correct Formatting with Dashes:**
```al
// Original test plan format:
**And** - Line 1: report design code = FORMULA-VALIDATION-TEST; table No = 37; Table Name = Sales Line; sequence = 10;
**When** I create a new calculated field with:
  - Field Name: "ValidBracketFormula"
  - Calculation Type: "Custom"
  - Custom Formula: `[Line Amount] - [Line Discount Amount]` 
**And** I save the calculated field

// CORRECT AL comment format (dash items on same line):
// [GIVEN] Line 1: report design code = FORMULA-VALIDATION-TEST; table No = 37; Table Name = Sales Line; sequence = 10;
// [WHEN] I create a new calculated field with: Field Name: "ValidQuotedFormula"; Calculation Type: "Custom"; Custom Formula: `("Line Amount" + "Unit Price") * "Quantity"` 
// [WHEN] I save the calculated field
```

**WRONG Formatting (separate lines for each dash item):**
```al
// ❌ WRONG - Do not create separate comment lines for dash items:
// [WHEN] I create a new calculated field with:
// [WHEN] Field Name: "ValidQuotedFormula"
// [WHEN] Calculation Type: "Custom"
// [WHEN] Custom Formula: `("Line Amount" + "Unit Price") * "Quantity"` 
// [WHEN] I save the calculated field
```

**Formatting Rules:**
- ✅ **Combine** dash items into a single comment line using semicolons (;) as separators
- ✅ **Preserve** all original text, quotes, and punctuation from dash items
- ✅ **Maintain** the logical grouping of related dash items
- ❌ **Never** create separate comment lines for each dash item
- ❌ **Never** modify the content of dash items when combining them

**MANDATORY Test Plan to AL Comment Transformation Example:**

**CRITICAL**: Here is the exact transformation that must be followed when converting test plan format to AL comments:

**Original Test Plan Format:**
```
### Scenario 1: Potency-Tracked Item Active Quantity Calculation (Happy Path)
**Given** Today date = 09/18/2025  
**Given** Item "VITC001" exists with Description = "Vitamin C Powder"  
**Given** Item Attribute "Potency" exists with Type = Decimal  
**Given** Item "VITC001" has Item Attribute "Potency" with value = 20.0 (20% active)  
**Given** Lot Attribute "Potency" exists and related field 'Item Attribute' = "Potency"  
**Given** Advanced Attributes Setup page field 'Active Potency Attribute' = "Potency"  
**Given** Formulation Version "01" exists  
**Given** Formulation line exists with Line Type = Item, No. = "VITC001", Component Type = "Active Ingredient"  
**When** User sets Active Quantity/Unit = 100.0 (mg) on the formulation line  
**Then** System calculates Quantity (Net) = 500.0 (mg) using formula: 100.0 / (20.0 / 100) = 500.0  
**Then** Quantity (Gross) = 500.0 (mg) (same as Net when no Loss %)  
```

**MANDATORY AL Comment Format (NEVER CHANGE, NEVER ADD, NEVER REMOVE ANY LINE):**
```al
// [SCENARIO 1] Potency-Tracked Item Active Quantity Calculation (Happy Path)

// [GIVEN] Today date = 09/18/2025
// [GIVEN] Item "VITC001" exists with Description = "Vitamin C Powder"
// [GIVEN] Item Attribute "Potency" exists with Type = Decimal
// [GIVEN] Item "VITC001" has Item Attribute "Potency" with value = 20.0 (20% active)
// [GIVEN] Lot Attribute "Potency" exists and related field 'Item Attribute' = "Potency"
// [GIVEN] Advanced Attributes Setup page field 'Active Potency Attribute' = "Potency"
// [GIVEN] Formulation Version "01" exists
// [GIVEN] Formulation line exists with Line Type = Item, No. = "VITC001", Component Type = "Active Ingredient"
// [WHEN] User sets Active Quantity/Unit = 100.0 (mg) on the formulation line
// [THEN] System calculates Quantity (Net) = 500.0 (mg) using formula: 100.0 / (20.0 / 100) = 500.0
// [THEN] Quantity (Gross) = 500.0 (mg) (same as Net when no Loss %)
```

**TRANSFORMATION RULES - MANDATORY:**
1. **Scenario Title**: `### Scenario 1:` becomes `// [SCENARIO 1]` + exact title text
2. **Given Statements**: `**Given**` becomes `// [GIVEN]` + exact text after the bold marker
3. **When Statements**: `**When**` becomes `// [WHEN]` + exact text after the bold marker  
4. **Then Statements**: `**Then**` becomes `// [THEN]` + exact text after the bold marker
5. **Preserve Everything**: All punctuation, quotes, numbers, formulas, units (mg), percentages - EVERYTHING must be identical
6. **Line Spacing**: Each comment gets its own line, with blank lines between sections as shown
7. **NO MODIFICATIONS**: Never change dates (09/18/2025), item codes (VITC001), values (20.0), formulas, or any other content

**FORBIDDEN ACTIONS:**
- ❌ **NEVER** change "09/18/2025" to current date
- ❌ **NEVER** change "VITC001" to generic item name
- ❌ **NEVER** change "20.0" to different values
- ❌ **NEVER** simplify formulas like "100.0 / (20.0 / 100) = 500.0"
- ❌ **NEVER** combine multiple GIVEN lines into one comment
- ❌ **NEVER** add explanatory text to any comment
- ❌ **NEVER** remove any line from the original test plan

This transformation is **MANDATORY** and **IMMUTABLE** - any deviation violates Aptean ATDD standards and breaks traceability.

#### **CRITICAL RULE: **And** Keyword Transformation - Context Inheritance**

**MANDATORY - VERY IMPORTANT**: When test plans use the `**And**` keyword, it must be transformed to inherit the context from the immediately preceding statement type (`// [GIVEN]`, `// [WHEN]`, or `// [THEN]`).

**Transformation Rules for **And** Keyword:**
1. `### Scenario X:` → `// [SCENARIO X]:`
2. `**Given**` → `// [GIVEN]`
3. `**When**` → `// [WHEN]`
4. `**Then**` → `// [THEN]`
5. `**And**` → Inherits the last context:
   - If previous statement was `// [GIVEN]`, use `// [GIVEN]`
   - If previous statement was `// [WHEN]`, use `// [WHEN]`
   - If previous statement was `// [THEN]`, use `// [THEN]`

**CORRECT Example:**

**Original Test Plan Format:**
```
### Scenario 1: Create New Opportunity and Mark as PD Type (Happy Path)
**Given** User "USER001" exists with Name = "Sales User" and permissions to modify Opportunity Type  
**Given** Contact "CONT001" exists with Name = "Contact1"  
**Given** Customer "CUST001" exists with Name = "Test Customer" and Contact = "CONT001"  
**Given** No. Series exists with Code = "OPPORTUNITY" and Starting No = "OPP00001"  
**Given** Opportunity Type field exists with options: "Normal", "PD"  
**When** User creates new Opportunity and selects Opportunity Type = "PD"  
**Then** Opportunity is created with Opportunity Type = "PD"  
**And** Opportunity Type field displays "PD" value clearly  
**And** Opportunity is marked as Product Development request
```

**CORRECT AL Comment Format:**
```al
// [SCENARIO 1]: Create New Opportunity and Mark as PD Type (Happy Path)
// [GIVEN] User "USER001" exists with Name = "Sales User" and permissions to modify Opportunity Type  
// [GIVEN] Contact "CONT001" exists with Name = "Contact1"  
// [GIVEN] Customer "CUST001" exists with Name = "Test Customer" and Contact = "CONT001"  
// [GIVEN] No. Series exists with Code = "OPPORTUNITY" and Starting No = "OPP00001"  
// [GIVEN] Opportunity Type field exists with options: "Normal", "PD"  
// [WHEN] User creates new Opportunity and selects Opportunity Type = "PD"  
// [THEN] Opportunity is created with Opportunity Type = "PD"  
// [THEN] Opportunity Type field displays "PD" value clearly  
// [THEN] Opportunity is marked as Product Development request
```

**Context Inheritance Examples:**

**Example 1 - **And** after **Given**:**
```
**Given** Setup exists with Customer "CUST001"
**And** Customer has Credit Limit = 1000
**And** Customer has Payment Terms = "30 Days"

Transforms to:
// [GIVEN] Setup exists with Customer "CUST001"
// [GIVEN] Customer has Credit Limit = 1000
// [GIVEN] Customer has Payment Terms = "30 Days"
```

**Example 2 - **And** after **When**:**
```
**When** User opens the Customer Card
**And** User enters Name = "Test Customer"
**And** User saves the record

Transforms to:
// [WHEN] User opens the Customer Card
// [WHEN] User enters Name = "Test Customer"
// [WHEN] User saves the record
```

**Example 3 - **And** after **Then**:**
```
**Then** Customer is successfully created
**And** Customer Name displays "Test Customer"
**And** Customer Status is "Active"

Transforms to:
// [THEN] Customer is successfully created
// [THEN] Customer Name displays "Test Customer"
// [THEN] Customer Status is "Active"
```

**CRITICAL VALIDATION:**
- ✅ **Count verification**: If test plan has 10 lines (including **And** statements), AL comments must have 10 lines
- ✅ **Context preservation**: Each **And** must inherit the correct context from the previous statement
- ✅ **Sequential logic**: The context chain must be logical (GIVEN → WHEN → THEN)
- ❌ **NEVER** use `// [AND]` - this is forbidden
- ❌ **NEVER** break the context chain by using wrong context type

**WRONG Examples (NEVER DO THIS):**
```al
// ❌ WRONG - Using [AND] instead of inheriting context:
// [GIVEN] Setup exists
// [AND] Customer has Credit Limit = 1000  ❌ Should be [GIVEN]

// ❌ WRONG - Breaking context chain:
// [GIVEN] Setup exists
// [WHEN] Customer has Credit Limit = 1000  ❌ Should be [GIVEN] (inherits from previous GIVEN)

// ❌ WRONG - Not preserving exact text:
// [THEN] Opportunity created successfully  ❌ Must match exact test plan text
```

**Enforcement Rules:**
- **Context inheritance** is mandatory for all **And** statements
- **Line count** must match exactly between test plan and AL comments (10 lines = 10 comments)
- **Text preservation** applies to **And** statements just like all other statements
- **No modifications** allowed - only transformation of `**And**` to appropriate context marker

This rule ensures that test scenarios maintain proper logical flow while preserving the exact specification from the test plan.

#### **CRITICAL RULE: Prefer TestPage Assertions in // [THEN] Sections**

**MANDATORY - VERY IMPORTANT**: In `// [THEN]` sections, always prefer TestPage assertions over direct record assertions to validate what the user actually sees in the UI. This ensures tests verify the actual user experience, not just database state.

**Why TestPage Assertions Matter:**
- ✅ **User perspective**: Validates what users actually see on the screen
- ✅ **UI logic validation**: Catches UI-specific bugs (visibility, editability, calculated fields)
- ✅ **Real behavior**: Tests the complete flow including UI triggers and validations
- ✅ **Better coverage**: Ensures UI and business logic work together correctly

**WRONG Approach - Direct Record Assertions:**
```al
// [THEN] Opportunity is created with Opportunity Type = "PD"
Opportunity.Get(OpportunityNo);
LibraryAssert.AreEqual('PD', Opportunity."Opportunity Type", OpportunityTypeErrorLbl);

// [THEN] Opportunity Type field displays "PD" value clearly
Opportunity.Get(OpportunityNo);
LibraryAssert.AreEqual('PD', Opportunity."Opportunity Type", OpportunityTypeDisplayErrorLbl);

// [THEN] Customer Status is "Active"
Customer.Get(CustomerNo);
LibraryAssert.AreEqual(Customer.Status::Active, Customer.Status, CustomerStatusErrorLbl);
```

**CORRECT Approach - TestPage Assertions:**
```al
// [THEN] Opportunity is created with Opportunity Type = "PD"
OpportunityCard.GoToRecord(Opportunity);
LibraryAssert.AreEqual('PD', OpportunityCard."Opportunity Type".Value, OpportunityTypeErrorLbl);

// [THEN] Opportunity Type field displays "PD" value clearly
LibraryAssert.AreEqual('PD', OpportunityCard."Opportunity Type".Value, OpportunityTypeDisplayErrorLbl);

// [THEN] Customer Status is "Active"
CustomerCard.GoToRecord(Customer);
LibraryAssert.AreEqual(Format(Customer.Status::Active), CustomerCard.Status.Value, CustomerStatusErrorLbl);
```

**Best Practices for // [THEN] Sections:**

1. **Open TestPage Once**: If the TestPage was opened in `// [WHEN]`, reuse it in `// [THEN]`
   ```al
   // [WHEN] User creates new Opportunity and selects Opportunity Type = "PD"
   OpportunityCard.OpenNew();
   OpportunityCard."Opportunity Type".SetValue('PD');
   
   // [THEN] Opportunity Type field displays "PD" value clearly
   LibraryAssert.AreEqual('PD', OpportunityCard."Opportunity Type".Value, OpportunityTypeErrorLbl);
   ```

2. **Navigate to Record**: If TestPage wasn't opened in `// [WHEN]`, use `GoToRecord()` in `// [THEN]`
   ```al
   // [THEN] Formulation Version Status is "Certified"
   FormVersionCard.GoToRecord(FormulationVersion);
   LibraryAssert.AreEqual(Format(Enum::"BOM Status"::Certified), FormVersionCard.Status.Value, StatusErrorLbl);
   ```

3. **Multiple Assertions**: Keep TestPage open for multiple related assertions
   ```al
   // [THEN] Customer is successfully created
   CustomerCard.GoToRecord(Customer);
   LibraryAssert.AreEqual('Test Customer', CustomerCard.Name.Value, CustomerNameErrorLbl);
   
   // [THEN] Customer Status is "Active"
   LibraryAssert.AreEqual(Format(Customer.Status::Active), CustomerCard.Status.Value, CustomerStatusErrorLbl);
   
   // [THEN] Customer Credit Limit is 1000
   LibraryAssert.AreEqual(Format(1000), CustomerCard."Credit Limit (LCY)".Value, CreditLimitErrorLbl);
   ```

4. **Field Visibility/Editability**: TestPage can validate UI state that records cannot
   ```al
   // [THEN] Opportunity Type field is visible and editable
   LibraryAssert.IsTrue(OpportunityCard."Opportunity Type".Visible(), OpportunityTypeVisibilityErrorLbl);
   LibraryAssert.IsTrue(OpportunityCard."Opportunity Type".Editable(), OpportunityTypeEditableErrorLbl);
   ```

**When Direct Record Assertions Are Acceptable:**
- ❌ **NEVER** for UI-facing scenarios where user interaction is being tested
- ✅ **Only** for backend validation of related records not shown on the current page
- ✅ **Only** for validating database triggers or background calculations

**Example - Mixed Approach (when appropriate):**
```al
// [THEN] Sales Order is created with correct header values
SalesOrderPage.GoToRecord(SalesHeader);
LibraryAssert.AreEqual(CustomerNo, SalesOrderPage."Sell-to Customer No.".Value, CustomerNoErrorLbl);

// [THEN] Sales Order Line is automatically created in the database
SalesLine.SetRange("Document Type", SalesHeader."Document Type");
SalesLine.SetRange("Document No.", SalesHeader."No.");
LibraryAssert.RecordCount(SalesLine, 1, SalesLineCountErrorLbl);  // Backend validation
```

**Critical Enforcement:**
- ✅ **UI tests**: Always use TestPage assertions in `// [THEN]` sections
- ✅ **User experience**: Validate what users see, not just database state
- ✅ **Complete coverage**: Test both UI display and underlying data when needed
- ❌ **Avoid shortcuts**: Don't skip TestPage assertions to save time
- ❌ **No mixed signals**: If testing UI, don't validate with records

**Quality Gate:**
During code reviews, verify that:
1. All `// [THEN]` assertions use TestPage when testing UI scenarios
2. TestPage objects are properly opened/navigated before assertions
3. Direct record assertions are only used for non-UI backend validations
4. Field values are accessed via `.Value` property on TestPage fields

This rule ensures tests validate the actual user experience and catch UI-specific issues that direct record assertions would miss.

#### **CRITICAL RULE: NEVER CHANGE TEST SCENARIO QUOTES OR PUNCTUATION**

**EXTREMELY CRITICAL - NEVER EVER VIOLATE**: When converting test scenarios to AL comments, preserve ALL quotes, punctuation, and special characters EXACTLY as they appear in the original test plan. This includes single quotes, double quotes, backticks, commas, periods, and any other punctuation marks.

**FORBIDDEN ACTIONS - NEVER DO THIS:**
- ❌ **NEVER** change quote types (single to double, double to single, backticks to quotes)
- ❌ **NEVER** remove or add commas, periods, or any punctuation
- ❌ **NEVER** modify special characters like backticks, apostrophes, or symbols
- ❌ **NEVER** change spacing around punctuation marks
- ❌ **NEVER** alter any character in formulas, expressions, or code snippets

**CORRECT Example:**
```
Original Test Plan:
**When** I create a new calculated field with:
  - Field Name: "SingleQuoteError"
  - Calculation Type: "Custom"
  - Custom Formula: `'Line Amount' + 'Unit Price'`  # Single quotes instead of double

CORRECT AL Comment (preserve everything exactly):
// [WHEN] I create a new calculated field with:
// [WHEN] Field Name: "SingleQuoteError"
// [WHEN] Calculation Type: "Custom"
// [WHEN] Custom Formula: `'Line Amount' + 'Unit Price'`  # Single quotes instead of double
```

**WRONG Example (NEVER DO THIS):**
```
// [WHEN] I create a new calculated field with:
// [WHEN] Field Name: "SingleQuoteError"
// [WHEN] Calculation Type: "Custom"
// [WHEN] Custom Formula: `'Line Amount' + 'Unit Price'`  ❌ WRONG - removed comment
```

**ENFORCEMENT:**
- Every single character from the test plan must be preserved in AL comments
- Quotes, punctuation, and special characters are part of the specification
- Any change to punctuation or quotes breaks traceability and violates requirements
- Code reviews must verify character-by-character accuracy of test scenario comments

This rule is **ABSOLUTE** and **NON-NEGOTIABLE** - test scenario text is the immutable specification that must never be altered in any way.

---

## Changelog

- Consolidated `ATDD Apten Overview.txt` into this optimized Markdown.
- Merged and aligned rules with the more comprehensive `ATDD.md`.
- Added Aptean-specific guidance on library design, handler usage, and test hygiene.
- Added enhanced AL coding guidelines for variable declarations, usage rules, and test scenario comments.
- Added test permissions rules forbidding `TestPermissions = Disabled;` and requiring proper `SetTestPermissions()` implementation.
- Added rule forbidding `Commit();` in test procedures to maintain test isolation and proper rollback behavior.
- Added strict rule forbidding extra comments in test code to ensure consistency and maintainability.
- Added object identifier length rules specifying 30-character limits for AL application objects.
- Added comprehensive mandatory rule requiring test plan comments to match exactly line by line without changes, modifications, or aggregations to maintain traceability and specification integrity.
- Added rule forbidding comments in library functions to maintain clean, self-documenting code through clear naming and parameter usage.
- Added single responsibility principle rule for library functions requiring each function to perform only one action (create, modify, get, or find).
- Added validation rule for library create functions requiring use of Insert(true) to trigger validation and ensure data integrity.
- Added rule requiring use of Validate() method instead of direct field assignment (:=) in library functions to trigger field validation and business logic.
- Added rule requiring library functions to create records with all meaningful fields, not just minimum required fields, to ensure realistic test data.
- Added rule requiring the first parameter in library create functions to be the record variable (passed by var) that will be created and returned.
- Added critical rule requiring absolute preservation of all quotes, punctuation, and special characters in test scenario comments to maintain specification integrity and traceability.
