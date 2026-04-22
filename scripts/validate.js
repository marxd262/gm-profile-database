/**
 * Profile Validation Script
 * Validates all profile index.json files against the schema
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

/**
 * Main validation function
 */
async function validate() {
  console.log(`${colors.bold}${colors.blue}🔍 Validating Profiles...${colors.reset}\n`);

  try {
    // Load schemas
    const indexSchemaPath = join(__dirname, '../src/schemas/index.schema.json');
    const indexSchemaData = await readFile(indexSchemaPath, 'utf-8');
    const indexSchema = JSON.parse(indexSchemaData);

    const validateIndex = ajv.compile(indexSchema);

    // Find all index.json files
    const indexFiles = await glob('profiles/*/index.json', { cwd: join(__dirname, '..') });

    if (indexFiles.length === 0) {
      console.log(`${colors.yellow}⚠️  No profiles found in profiles/ directory${colors.reset}\n`);
      process.exit(0);
    }

    console.log(`Found ${indexFiles.length} profile(s) to validate\n`);

    const errors = [];
    let validCount = 0;

    // Validate each profile
    for (const file of indexFiles) {
      const filePath = join(__dirname, '..', file);
      const profileName = file.split('/')[1];

      try {
        const data = await readFile(filePath, 'utf-8');
        const profileData = JSON.parse(data);

        // Validate against schema
        const isValid = validateIndex(profileData);

        if (isValid) {
          console.log(`${colors.green}✓${colors.reset} ${profileName}`);
          validCount++;
        } else {
          console.log(`${colors.red}✗${colors.reset} ${profileName}`);
          errors.push({
            profile: profileName,
            file: 'index.json',
            errors: validateIndex.errors || [],
          });

          // Print detailed errors
          if (validateIndex.errors) {
            validateIndex.errors.forEach(err => {
              console.log(`  ${colors.red}↳${colors.reset} ${err.instancePath || '/'}: ${err.message}`);
              if (err.params) {
                console.log(`    ${colors.yellow}${JSON.stringify(err.params)}${colors.reset}`);
              }
            });
          }
        }
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${profileName} - ${error.message}`);
        errors.push({
          profile: profileName,
          file: 'index.json',
          errors: [{ message: error.message }],
        });
      }
    }

    // Summary
    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`${colors.green}${validCount} valid${colors.reset}`);
    console.log(`${colors.red}${errors.length} invalid${colors.reset}`);
    console.log(`${colors.blue}${indexFiles.length} total${colors.reset}\n`);

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      total: indexFiles.length,
      valid: validCount,
      invalid: errors.length,
      errors: errors,
    };

    // Write report to file
    const reportPath = join(__dirname, '../validation-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`${colors.blue}📄 Validation report written to validation-report.json${colors.reset}\n`);

    // Exit with error code if there are validation errors
    if (errors.length > 0) {
      console.log(`${colors.red}${colors.bold}❌ Validation failed${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`${colors.green}${colors.bold}✅ All profiles are valid${colors.reset}\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bold}Error during validation:${colors.reset}`, error);
    process.exit(1);
  }
}

// Import writeFile
import { writeFile } from 'fs/promises';

// Run validation
validate();
