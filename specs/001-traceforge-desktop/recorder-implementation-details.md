# Recorder Page Implementation Details

## Overview
The Recorder page (ForgeRecorder.tsx) is the core component for capturing user interactions with web applications and converting them into automation scripts.

## Required Features

### 1. Full-Screen Recording Mode (FR-002)
- The recorder must open in full-screen mode when initiated
- Must capture user interactions in real-time with <500ms UI update delay
- Must update screenshots every 3 seconds during active recording
- Must display hierarchical tree view (Scenarios > Pages > Actions)

### 2. Automatic Interaction Capture (US1 Scenario 2)
- Capture all user actions: clicks, fills, navigates, hovers, etc.
- Automatically generate timestamps for each captured step
- Capture screenshots at each action
- Generate suggested element locators using priority order (role → text → CSS → XPath)
- Display captured steps in the hierarchical tree view in real-time

### 3. WebSocket Communication (FR-009)
- Establish WebSocket connection with ForgeEngine
- Send recording start/stop commands to the engine
- Receive step capture events from the engine
- Handle screenshot data from the engine
- Maintain <200ms latency for UI updates
- Implement proper error handling for connection issues

### 4. Locator Generation (FR-003)
- Automatically generate multiple locator strategies for each element
- Use priority order: role-based → text-based → CSS → XPath
- Allow manual addition of fallback locators
- Test locators for accuracy and uniqueness
- Store locators with captured actions

### 5. Manual Action Insertion (FR-018)
- Allow users to manually insert actions during recording
- Support action types: Navigate, Click, Fill, Hover, Wait, Assert, Screenshot
- Enable user-defined parameters for manual actions
- Maintain proper ordering in the action sequence

### 6. Wait Condition Injection (FR-019)
- Automatically detect network activity and DOM changes
- Inject appropriate wait conditions after actions
- Support different wait types: selector_visible, network_idle, etc.

## UI Components Required

### Main Layout
- Full-screen container with recording controls
- Hierarchical tree view showing captured steps
- Screenshot preview panel
- Action details panel
- Recording controls (start, stop, pause)

### Recording Controls
- Start/Stop recording button
- Pause/Resume functionality
- Save recording button
- Kernel selection dropdown
- Target URL input

### Tree View Integration
- Real-time updates as steps are captured
- Support for Scenarios, Pages, and Actions hierarchy
- Visual indicators for different action types
- Ability to select and inspect individual steps

## State Management

### Recording State
- `recording: boolean` - Whether recording is active
- `currentScenario: Scenario` - Current scenario being recorded
- `currentPage: Page` - Current page being recorded
- `actions: Action[]` - List of captured actions
- `currentStep: number` - Index of current step being recorded

### Engine Connection State
- `engineConnected: boolean` - WebSocket connection status
- `kernelId: string` - Selected kernel for recording
- `sessionId: string` - Current recording session ID

## WebSocket Event Handling

### Outgoing Messages
- `start_recording`: Initialize recording session with target URL and kernel
- `stop_recording`: End current recording session
- `pause_recording`: Temporarily pause recording
- `resume_recording`: Resume paused recording

### Incoming Events
- `step_captured`: New action captured, update tree view
- `screenshot`: Screenshot data received, update preview
- `recording_status`: Update recording state and UI
- `error`: Handle recording errors and display to user

## Integration Points

### With Kernel Management
- Access available Chrome kernels from kernel store
- Set default recording kernel from settings
- Validate kernel compatibility before recording

### With Database Store
- Save completed recordings to SQLite database
- Load existing recordings for reference
- Manage recording metadata (name, description, etc.)

### With Screenshot Viewer
- Display captured screenshots in real-time
- Enable screenshot preview and inspection
- Support screenshot download/export

## Performance Requirements

### UI Responsiveness
- <500ms delay for UI updates during recording
- Smooth rendering of tree view with 100+ steps
- Efficient virtual scrolling for large recordings

### Resource Management
- Memory efficient handling of screenshots
- Proper cleanup of WebSocket connections
- Optimized rendering of tree components

## Error Handling

### Engine Connection
- Handle WebSocket connection failures gracefully
- Implement automatic reconnection with exponential backoff
- Display clear error messages to user

### Recording Issues
- Handle failed step captures
- Manage screenshot capture failures
- Provide recovery options for interrupted recordings

## Testing Requirements

### Unit Tests
- Test WebSocket message handling
- Verify state management logic
- Validate locator generation algorithms

### Integration Tests
- Test end-to-end recording workflow
- Verify database persistence
- Validate UI component interactions

### Performance Tests
- Verify <500ms UI update requirement
- Test with recordings containing 100+ steps
- Validate memory usage during long recording sessions