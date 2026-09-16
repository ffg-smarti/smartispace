#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load the current OpenAPI specification packages/smarti-api/openapi.json
const openapiPath = path.join(__dirname, 'packages/smarti-api/openapi.json');
let spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

// Focus on key endpoints that need 400 status code documentation
const endpointsNeeding400Documentation = [
  // Account Domain - ~40 failures
  '/api/v1/accounts/login/',
  '/api/v1/accounts/register/',
  '/api/v1/accounts/child-login/',
  '/api/v1/accounts/logout/',
  '/api/v1/accounts/parents/{parent_id}/',
  '/api/v1/accounts/child/register',
  '/api/v1/accounts/children/{child_id}/',
  
  // Content Domain - ~120 failures (highest priority)
  '/api/v1/content/items/scan/',
  '/api/v1/content/items/scan/{item_id}/url/',
  '/api/v1/content/items/cards/batch/',
  '/api/v1/content/items/course-presentation/',
  '/api/v1/content/items/fill-the-blanks/',
  '/api/v1/content/items/media/upload/',
  '/api/v1/content/items/media/upload-image/',
  '/api/v1/content/items/media/resolve/',
  '/api/v1/content/items/',
  '/api/v1/content/items/search/',
  '/api/v1/content/items/{item_id}/assets/',
  '/api/v1/content/items/{item_id}/with-player/',
  '/api/v1/content/items/{item_id}/',
  '/api/v1/content/items/{item_id}/restore/',
  '/api/v1/content/items/{item_id}/hard/',
  '/api/v1/content/items/cleanup-candidates/',
  '/api/v1/content/items/bulk-orphan/',
  '/api/v1/content/items/{item_id}/review-status/',
  '/api/v1/content/items/assessment/validate/',
  
  // Learning Plans Domain - ~50 failures
  '/api/v1/learning-plans/plan/',
  '/api/v1/learning-plans/plan/{id}/',
  '/api/v1/learning-plans/plan/{id}/start/',
  '/api/v1/learning-plans/plan/{id}/complete/',
  '/api/v1/learning-plans/plan/{id}/cancel/',
  '/api/v1/learning-plans/plan/{id}/strategy/',
  '/api/v1/learning-plans/plan/{id}/goal/',
  '/api/v1/learning-plans/plan/{id}/reward/',
  '/api/v1/learning-plans/plan/{id}/schedule/',
  '/api/v1/learning-plans/plan/{id}/assign-child/',
  '/api/v1/learning-plans/plan/{id}/reward/estimate/',
  '/api/v1/learning-plans/plan/{id}/progress/',
  '/api/v1/learning-plans/rewards/{id}/claim/',
  '/api/v1/learning-plans/plan/{id}/restore/',
  '/api/v1/learning-plans/plan/{id}/hard/',
  
  // Learning Paths Domain - ~40 failures
  '/api/v1/learning-paths/path/',
  '/api/v1/learning-paths/path/{path_id}/',
  '/api/v1/learning-paths/path/public/',
  '/api/v1/learning-paths/path/{path_id}/stations/',
  '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/',
  '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/remove/',
  '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/items/',
  
  // Sessions Domain - ~20 failures
  '/api/v1/sessions/{session_id}/commit/',
  '/api/v1/sessions/{session_id}/complete-item/',
  '/api/v1/sessions/{session_id}/skip-item/',
  '/api/v1/sessions/{session_id}/complete/',
  '/api/v1/sessions/{session_id}/abort/',
  
  // Children Domain - ~5 failures
  '/api/v1/children/dashboard/',
  
  // FFG Domain - ~15 failures
  '/api/v1/ffg/guest/',
  '/api/v1/ffg/guest/delete/',
  '/api/v1/ffg/session/start/',
  '/api/v1/ffg/session/{session_id}/complete-item/',
  '/api/v1/ffg/session/{session_id}/skip-item/',
  '/api/v1/ffg/session/{session_id}/complete/',
  '/api/v1/ffg/session/{session_id}/abort/',
  '/api/v1/ffg/session/{session_id}/tasks/',
  '/api/v1/ffg/report/request/',
  
  // Generic error responses for schemas
  '/api/v1/content/media/upload/',
  '/api/v1/content/media/upload-image/',
  '/api/v1/content/media/resolve/',
];

// Add 400 error responses to endpoints that don't have them
function addMissing400Responses(endpoint) {
  if (!spec.paths[endpoint]) {
    return false;
  }
  
  const methods = Object.keys(spec.paths[endpoint]);
  let updated = false;
  
  methods.forEach(method => {
    const operation = spec.paths[endpoint][method];
    
    // Check if the operation doesn't have a 400 response
    if (!operation.responses || !operation.responses['400']) {
      // Add a 400 response with appropriate description
      operation.responses['400'] = {
        "description": getValidationErrorDescription(endpoint, method),
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      };
      updated = true;
    }
  });
  
  return updated;
}

// Get appropriate description for validation errors
function getValidationErrorDescription(endpoint, method) {
  const endpointMap = {
    '/api/v1/accounts/login/': 'Invalid credentials - wrong email or password',
    '/api/v1/accounts/register/': 'Registration failed - email already exists or password does not meet requirements',
    '/api/v1/accounts/child-login/': 'Invalid PIN - wrong username or PIN',
    '/api/v1/accounts/logout/': 'Logout failed - invalid session or authentication',
    '/api/v1/accounts/parents/{parent_id}/': 'Cannot delete parent - parent has associated children or other constraints',
    '/api/v1/accounts/child/register': 'Child registration failed - invalid data or email already exists',
    '/api/v1/accounts/children/{child_id}/': 'Cannot delete child - child has associated sessions or other constraints',
    '/api/v1/content/items/scan/': 'Scan upload failed - invalid file format, missing required fields, or content validation failed',
    '/api/v1/content/items/scan/{item_id}/url/': 'Cannot renew URL - scan item not found or invalid',
    '/api/v1/content/items/cards/batch/': 'Card batch creation failed - invalid card data or batch size limits exceeded',
    '/api/v1/content/items/course-presentation/': 'Course presentation creation failed - invalid content format or validation errors',
    '/api/v1/content/items/fill-the-blanks/': 'Fill-in-blanks content creation failed - invalid answer count or format',
    '/api/v1/content/items/media/upload/': 'Media upload failed - invalid file format or content validation failed',
    '/api/v1/content/items/media/upload-image/': 'Image upload failed - invalid file format or content validation failed',
    '/api/v1/content/items/media/resolve/': 'Cannot resolve media URL - token expired or invalid',
    '/api/v1/content/items/': 'Item retrieval failed - invalid filters, pagination parameters, or content validation failed',
    '/api/v1/content/items/search/': 'Content search failed - invalid search parameters or validation errors',
    '/api/v1/content/items/{item_id}/assets/': 'Cannot get item assets - item not found or access denied',
    '/api/v1/content/items/{item_id}/with-player/': 'Cannot load item with player - item not found or invalid',
    '/api/v1/content/items/{item_id}/': 'Item operation failed - invalid data, validation failed, or item not found',
    '/api/v1/content/items/{item_id}/restore/': 'Cannot restore item - item not found, already restored, or validation failed',
    '/api/v1/content/items/{item_id}/hard/': 'Hard delete failed - item not found or validation failed',
    '/api/v1/content/items/cleanup-candidates/': 'Cleanup failed - validation errors or system constraints',
    '/api/v1/content/items/bulk-orphan/': 'Bulk orphan operation failed - invalid item selection or validation errors',
    '/api/v1/content/items/{item_id}/review-status/': 'Review status update failed - invalid data or validation failed',
    '/api/v1/content/items/assessment/validate/': 'Score validation failed - invalid score range or format',
    '/api/v1/learning-plans/plan/': 'Plan creation failed - invalid data, duplicate title, or validation errors',
    '/api/v1/learning-plans/plan/{id}/': 'Plan operation failed - invalid data, validation failed, or plan not found',
    '/api/v1/learning-plans/plan/{id}/start/': 'Plan start failed - invalid state or validation failed',
    '/api/v1/learning-plans/plan/{id}/complete/': 'Plan completion failed - invalid state or validation failed',
    '/api/v1/learning-plans/plan/{id}/cancel/': 'Plan cancellation failed - invalid state or validation failed',
    '/api/v1/learning-plans/plan/{id}/strategy/': 'Plan strategy update failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/goal/': 'Plan goal update failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/reward/': 'Plan reward update failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/schedule/': 'Plan schedule update failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/assign-child/': 'Plan child assignment failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/reward/estimate/': 'Reward estimation failed - invalid plan data or calculation failed',
    '/api/v1/learning-plans/plan/{id}/progress/': 'Progress calculation failed - invalid data or calculation failed',
    '/api/v1/learning-plans/rewards/{id}/claim/': 'Reward claim failed - invalid reward data or validation failed',
    '/api/v1/learning-plans/plan/{id}/restore/': 'Plan restoration failed - invalid data or validation failed',
    '/api/v1/learning-plans/plan/{id}/hard/': 'Plan hard delete failed - invalid data or validation failed',
    '/api/v1/learning-paths/path/': 'Path creation failed - invalid data, duplicate title, or validation errors',
    '/api/v1/learning-paths/path/{path_id}/': 'Path operation failed - invalid data, validation failed, or path not found',
    '/api/v1/learning-paths/path/public/': 'Public path retrieval failed - invalid parameters or validation errors',
    '/api/v1/learning-paths/path/{path_id}/stations/': 'Station assignment failed - invalid data or validation failed',
    '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/': 'Station operation failed - invalid data or validation failed',
    '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/remove/': 'Station removal failed - invalid data or validation failed',
    '/api/v1/learning-paths/path/{path_id}/stations/{station_id}/items/': 'Station item assignment failed - invalid data or validation failed',
    '/api/v1/sessions/{session_id}/commit/': 'Session commit failed - invalid data, validation failed, or session completed',
    '/api/v1/sessions/{session_id}/complete-item/': 'Item completion failed - invalid data, validation failed, or item not available',
    '/api/v1/sessions/{session_id}/skip-item/': 'Item skip failed - invalid data, validation failed, or item not available',
    '/api/v1/sessions/{session_id}/complete/': 'Session completion failed - invalid data, validation failed, or session not in progress',
    '/api/v1/sessions/{session_id}/abort/': 'Session abort failed - invalid data, validation failed, or session already completed',
    '/api/v1/children/dashboard/': 'Dashboard load failed - invalid user data or validation failed',
    '/api/v1/ffg/guest/': 'FFG session creation failed - invalid guest data or validation failed',
    '/api/v1/ffg/guest/delete/': 'FFG guest deletion failed - invalid guest or validation failed',
    '/api/v1/ffg/session/start/': 'FFG session start failed - invalid data or validation failed',
    '/api/v1/ffg/session/{session_id}/complete-item/': 'FFG item completion failed - invalid data or validation failed',
    '/api/v1/ffg/session/{session_id}/skip-item/': 'FFG item skip failed - invalid data or validation failed',
    '/api/v1/ffg/session/{session_id}/complete/': 'FFG session completion failed - invalid data or validation failed',
    '/api/v1/ffg/session/{session_id}/abort/': 'FFG session abort failed - invalid data or validation failed',
    '/api/v1/ffg/session/{session_id}/tasks/': 'FFG tasks load failed - invalid session or validation failed',
    '/api/v1/ffg/report/request/': 'FFG report request failed - invalid data or validation failed',
  };

  return endpointMap[endpoint] || 'Invalid request - validation failed';
}

// Process all endpoints
console.log('Updating OpenAPI specification with missing 400 status code documentation...');
let updatedCount = 0;

endpointsNeeding400Documentation.forEach(endpoint => {
  if (addMissing400Responses(endpoint)) {
    updatedCount++;
    console.log(`✅ Updated: ${endpoint}`);
  }
});

// Ensure ErrorResponse schema exists
if (!spec.components || !spec.components.schemas) {
  spec.components = { schemas: {} };
}

if (!spec.components.schemas.ErrorResponse) {
  spec.components.schemas.ErrorResponse = {
    type: "object",
    properties: {
      "success": {
        "type": "boolean",
        "example": false
      },
      "message": {
        "type": "string",
        "example": "Validation failed"
      },
      "errors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ErrorItem"
        }
      }
    },
    "required": ["success", "message", "errors"]
  };
}

if (!spec.components.schemas.ErrorItem) {
  spec.components.schemas.ErrorItem = {
    type: "object",
    properties: {
      "field": {
        "type": "string",
        "description": "Field name that failed validation"
      },
      "code": {
        "type": "string",
        "enum": ["REQUIRED", "FORMAT", "RANGE", "DUPLICATE", "BUSINESS_RULE"],
        "description": "Type of validation error"
      },
      "message": {
        "type": "string",
        "description": "Human-readable error message"
      }
    },
    "required": ["field", "code", "message"]
  };
}

// Save the updated specification
fs.writeFileSync(openapiPath, JSON.stringify(spec, null, 2));
console.log(`\n✅ Successfully updated ${updatedCount} endpoints with missing 400 status code documentation!
📁 Updated file: ${openapiPath}`);
