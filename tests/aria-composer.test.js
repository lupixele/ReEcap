/**
 * Unit tests for Aria Composer:
 * - Minimalist single-box layout (prompt box + send/stop button)
 * - Absence of bloat badges and keyboard shortcuts footer
 * - Send / Stop button state machine and AbortController lifecycle
 * - Helper card dismissal immediately upon first prompt
 * - Fee ledger action delegation and navigation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const decoratorsSource = fs.readFileSync(path.join(__dirname, '../extension/decorators.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(__dirname, '../extension/style.css'), 'utf8');
const ariaSource = fs.readFileSync(path.join(__dirname, '../extension/shared/aria.js'), 'utf8');

console.log('Testing Aria Composer & Helper Card Lifecycle...');

// 1. Verify Composer HTML Structure in decorators.js
assert(decoratorsSource.includes('<form class="aria-composer prompt-bar-card" id="aria-composer">'), 'Composer form must exist');
assert(!decoratorsSource.includes('class="prompt-bar-badges"'), 'prompt-bar-badges must be removed from composer');
assert(!decoratorsSource.includes('class="prompt-bar-footer"'), 'prompt-bar-footer must be removed from composer');
assert(!decoratorsSource.includes('Aura Super'), 'Aura Super badge must be removed from composer');
assert(!decoratorsSource.includes('ERP Live'), 'ERP Live context pill must be removed from composer');
assert(!decoratorsSource.includes('Enter send •'), 'Shortcut footer text must be removed from composer');

// 2. Verify icon-send and icon-stop inside #aria-send-btn
assert(decoratorsSource.includes('class="icon-send"'), 'icon-send must be inside send button');
assert(decoratorsSource.includes('class="icon-stop"'), 'icon-stop must be inside send button');

// 3. Verify Clear Chat relocated to header actions
assert(decoratorsSource.includes('<button type="button" class="aria-header-btn" id="aria-clear-chat"'), 'Clear chat button must be relocated to aria-header-actions');

// 4. Verify helper card dismissal in submitAriaMessage
assert(decoratorsSource.includes('.aria-welcome-hero, .aria-welcome-card'), 'submitAriaMessage must query welcome cards');
assert(decoratorsSource.includes("suggestionsPanel.style.display = 'none'"), 'submitAriaMessage must dismiss suggestions panel');

// 5. Verify stop button state and AbortController integration
assert(decoratorsSource.includes('function setAriaGeneratingState('), 'setAriaGeneratingState must be defined');
assert(decoratorsSource.includes('function stopAriaGeneration('), 'stopAriaGeneration must be defined');
assert(decoratorsSource.includes('new AbortController()'), 'submitAriaMessage must initialize AbortController');
assert(decoratorsSource.includes('currentAriaAbortController.abort()'), 'stopAriaGeneration must abort controller');
assert(ariaSource.includes('signal: signal'), 'streamAriaChat must accept signal');

// 6. Verify Fee Ledger navigation
assert(decoratorsSource.includes('window.navigateToFeeDetails = navigateToFeeDetails'), 'navigateToFeeDetails must be exposed on window');
assert(decoratorsSource.includes("act === 'nav:fees' || act === 'nav:feedetails'"), 'Decorators must handle nav:fees action');
assert(ariaSource.includes("actionKey === 'nav:fees' || actionKey === 'nav:feedetails'"), 'Aria executePortalAction must handle nav:fees');
assert(ariaSource.includes('divProfile_Fees'), 'Fee navigation must target divProfile_Fees');

// 7. Verify CSS Rules
assert(styleSource.includes('.prompt-bar-container'), 'prompt-bar-container CSS must exist');
assert(styleSource.includes('.prompt-send-pill.is-stop'), 'prompt-send-pill.is-stop CSS must exist');
assert(/\.prompt-bar-controls,\s*\.prompt-bar-badges/.test(styleSource), 'Prompt bar controls and badges must be suppressed in CSS');

console.log('PASS: All Aria Composer, Stop Button, Fee Ledger, and Helper Card lifecycle tests passed cleanly.');
