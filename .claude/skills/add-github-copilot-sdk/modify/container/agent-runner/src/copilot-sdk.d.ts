declare module '@github/copilot-sdk' {
  export interface PermissionRequest {
    toolName?: string;
    toolArgs?: unknown;
  }

  export interface PermissionRequestResult {
    kind: 'approved' | 'denied';
    reason?: string;
  }

  export interface PreToolUseHookInput {
    toolName: string;
    toolArgs: unknown;
  }

  export interface PreToolUseHookResult {
    permissionDecision?: 'deny';
    permissionDecisionReason?: string;
    modifiedArgs?: Record<string, unknown>;
  }

  export interface SessionEndInvocation {
    sessionId: string;
  }

  export interface SessionHooks {
    onPreToolUse?: (
      input: PreToolUseHookInput,
    ) => Promise<PreToolUseHookResult | void> | PreToolUseHookResult | void;
    onSessionEnd?: (
      input: unknown,
      invocation: SessionEndInvocation,
    ) => Promise<void> | void;
  }

  export interface SessionConfig {
    workingDirectory?: string;
    configDir?: string;
    model?: string;
    systemMessage?: { mode: 'append'; content: string };
    onPermissionRequest?: (
      request: PermissionRequest,
    ) => Promise<PermissionRequestResult> | PermissionRequestResult;
    hooks?: SessionHooks;
    skillDirectories?: string[];
    mcpServers?: Record<
      string,
      {
        command: string;
        args?: string[];
        env?: Record<string, string>;
        tools?: string[];
      }
    >;
  }

  export interface ResumeSessionConfig extends SessionConfig {}

  export type SessionEvent =
    | { type: 'user.message'; data: { content?: string } }
    | { type: 'assistant.message'; data: { content?: string } }
    | { type: string; data: { content?: string } };

  export interface SessionErrorEvent {
    data: { message: string };
  }

  export interface SessionResponse {
    data?: { content?: string | null };
  }

  export interface CopilotSession {
    sessionId: string;
    send(args: { prompt: string }): Promise<void>;
    sendAndWait(args: { prompt: string }, timeoutMs?: number): Promise<SessionResponse>;
    getMessages(): Promise<SessionEvent[]>;
    on(event: 'session.error', handler: (event: SessionErrorEvent) => void): void;
    on(event: 'session.compaction_start', handler: () => void): void;
    rpc: {
      model: {
        getCurrent(): Promise<{ modelId?: string }>;
      };
    };
  }

  export class CopilotClient {
    constructor(options: {
      logLevel?: string;
      cwd?: string;
      githubToken: string;
      env?: Record<string, string>;
    });
    start(): Promise<void>;
    stop(): Promise<Array<{ message: string }>>;
    forceStop(): Promise<void>;
    listModels(): Promise<Array<{ id: string }>>;
    createSession(config: SessionConfig): Promise<CopilotSession>;
    resumeSession(
      sessionId: string,
      config: ResumeSessionConfig,
    ): Promise<CopilotSession>;
  }
}
