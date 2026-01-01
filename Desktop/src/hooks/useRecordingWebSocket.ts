import { useEffect, useRef } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import {
  getForgeWSClient,
  MessageTypes,
  type WSMessage,
} from '../lib/ws-client';

interface StepCapturedMessage extends WSMessage {
  step_id: string;
  action_type: string;
  description: string;
  target: string;
  url?: string;
  locators?: Array<{
    type: string;
    value: string;
    priority: number;
  }>;
  parameters?: Record<string, any>;
}

interface ScreenshotMessage extends WSMessage {
  step_id: string;
  screenshot_data: string;
}

interface RecordingStatusMessage extends WSMessage {
  status: 'recording' | 'paused' | 'idle';
  current_url?: string;
}

interface RecordingErrorMessage extends WSMessage {
  error_code: string;
  error_message: string;
  recoverable: boolean;
}

export function useRecordingWebSocket() {
  const clientRef = useRef<ReturnType<typeof getForgeWSClient>>(null);
  const {
    session,
    scenarios,
    currentScenarioId,
    currentPageId,
    addStep,
    updatePage,
    setScreenshot,
    addLog,
    updateSession,
    setCurrentScenario,
    setCurrentPage,
    addScenario,
    addPage,
  } = useRecordingStore();

  useEffect(() => {
    clientRef.current = getForgeWSClient();
    const client = clientRef.current;

    if (!client) {
      console.warn('[RecordingWS] No WebSocket client available');
      return;
    }

    const handleStepCaptured = (message: StepCapturedMessage) => {
      const stepId = message.step_id;
      const actionType = message.action_type;
      const description = message.description;
      const target = message.target;
      const url = message.url;

      addLog({
        time: new Date().toISOString().slice(11, 19),
        level: 'INFO',
        msg: `${actionType} action recorded: ${description}`,
      });

      let activeScenarioId = currentScenarioId;
      let activePageId = currentPageId;

      if (!activeScenarioId) {
        const newScenarioId = `scenario_${Date.now()}`;
        const newScenario = {
          id: newScenarioId,
          name: `Scenario ${scenarios.length + 1}`,
          pages: [],
        };
        addScenario(newScenario);
        setCurrentScenario(newScenarioId);
        activeScenarioId = newScenarioId;

        addLog({
          time: new Date().toISOString().slice(11, 19),
          level: 'INFO',
          msg: `Created new scenario: ${newScenario.name}`,
        });
      }

      if (!activePageId || url) {
        const existingPage = scenarios
          .find((s) => s.id === activeScenarioId)
          ?.pages.find((p) => p.url === url);

        if (existingPage) {
          setCurrentPage(existingPage.id);
          activePageId = existingPage.id;

          updatePage(activeScenarioId, activePageId, { active: true });
        } else if (activeScenarioId) {
          const newPageId = `page_${Date.now()}`;
          const scenario = scenarios.find((s) => s.id === activeScenarioId);
          const pageName = url || `Page ${(scenario?.pages.length || 0) + 1}`;
          const newPage = {
            id: newPageId,
            name: pageName,
            url,
            active: true,
            steps: [],
          };
          addPage(activeScenarioId, newPage);
          activePageId = newPageId;

          if (url) {
            addLog({
              time: new Date().toISOString().slice(11, 19),
              level: 'INFO',
              msg: `Navigated to ${url}`,
            });
          }
        }
      }

      const newStep = {
        id: stepId,
        type: actionType,
        desc: description,
        target,
        timestamp: message.timestamp,
        locators: message.locators?.map((loc, idx) => ({
          id: `loc_${stepId}_${idx}`,
          action_id: stepId,
          locator_type: loc.type as 'role' | 'text' | 'css' | 'xpath' | 'id',
          value: loc.value,
          priority: loc.priority,
          is_fallback: loc.priority > 0,
        })),
        parameters: message.parameters
          ? Object.entries(message.parameters).map(([key, value], idx) => ({
              id: `param_${stepId}_${idx}`,
              action_id: stepId,
              key,
              value: String(value),
              data_type: 'string' as const,
            }))
          : undefined,
      };

      if (activeScenarioId && activePageId) {
        addStep(activeScenarioId, activePageId, newStep);
      }
    };

    const handleScreenshot = (message: ScreenshotMessage) => {
      const { step_id, screenshot_data } = message;
      if (screenshot_data) {
        setScreenshot(step_id, screenshot_data);
      }
    };

    const handleRecordingStatus = (message: RecordingStatusMessage) => {
      const { status, current_url } = message;

      if (status === 'paused') {
        updateSession({ status: 'paused' });
        addLog({
          time: new Date().toISOString().slice(11, 19),
          level: 'INFO',
          msg: 'Recording paused by engine',
        });
      } else if (status === 'recording') {
        updateSession({ status: 'recording', targetUrl: current_url || session?.targetUrl || '' });
        addLog({
          time: new Date().toISOString().slice(11, 19),
          level: 'INFO',
          msg: 'Recording resumed by engine',
        });
      }

      if (current_url && session?.targetUrl !== current_url) {
        updateSession({ targetUrl: current_url });
      }
    };

    const handleRecordingError = (message: RecordingErrorMessage) => {
      const { error_code, error_message, recoverable } = message;

      addLog({
        time: new Date().toISOString().slice(11, 19),
        level: 'ERROR',
        msg: `Recording error [${error_code}]: ${error_message}`,
      });

      if (!recoverable) {
        updateSession({ status: 'idle' });
        addLog({
          time: new Date().toISOString().slice(11, 19),
          level: 'ERROR',
          msg: 'Recording terminated due to unrecoverable error',
        });
      }
    };

    client.on(MessageTypes.STEP_CAPTURED, handleStepCaptured as any);
    client.on(MessageTypes.SCREENSHOT_CAPTURED, handleScreenshot as any);
    client.on('recording_status', handleRecordingStatus as any);
    client.on('recording_error', handleRecordingError as any);

    return () => {
      client.off(MessageTypes.STEP_CAPTURED, handleStepCaptured as any);
      client.off(MessageTypes.SCREENSHOT_CAPTURED, handleScreenshot as any);
      client.off('recording_status', handleRecordingStatus as any);
      client.off('recording_error', handleRecordingError as any);
    };
  }, []);

  const startRecording = (url: string, kernelId: string) => {
    const client = clientRef.current;
    if (client) {
      client.send(MessageTypes.START_RECORDING, {
        target_url: url,
        kernel_id: kernelId,
        options: {
          capture_screenshots: true,
          generate_locators: true,
          screenshot_interval_ms: 3000,
        },
      });
    }
  };

  const stopRecording = () => {
    const client = clientRef.current;
    if (client) {
      client.send(MessageTypes.STOP_RECORDING, {});
    }
  };

  const pauseRecording = () => {
    const client = clientRef.current;
    if (client) {
      client.send('pause_recording', {});
    }
  };

  const resumeRecording = () => {
    const client = clientRef.current;
    if (client) {
      client.send('resume_recording', {});
    }
  };

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
