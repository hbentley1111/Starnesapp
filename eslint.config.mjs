// Module-boundary enforcement for the modular monolith (§2.2 enforced seams).
// Rule of thumb: feature modules may import from '@starnes/shared', their own
// folder, and 'common/'. Cross-module calls go through the module's public
// service injected via Nest DI — never deep relative imports into another module.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['../*/!(index)*', '../../modules/*/*'],
          message: 'Cross-module deep import. Import the module\'s exported service via DI instead (enforced monolith seam).'
        }]
      }]
    }
  }
);
