declare module '@modelcontextprotocol/sdk/server/mcp' {
  export class McpServer {
    constructor(options: { name: string; version: string });
    tool(name: string, schema: any, callback: (args: any) => any): void;
    tool(name: string, description: string, schema: any, callback: (args: any) => any): void;
    prompt(name: string, schema: any, callback: (args: any) => any): void;
    prompt(name: string, description: string, schema: any, callback: (args: any) => any): void;
    connect(transport: any): Promise<void>;
  }
}
// Stub for ESM import of MCP server with .js extension
declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(options: { name: string; version: string });
    tool(name: string, schema: any, callback: (args: any) => any): void;
    tool(name: string, description: string, schema: any, callback: (args: any) => any): void;
    prompt(name: string, schema: any, callback: (args: any) => any): void;
    prompt(name: string, description: string, schema: any, callback: (args: any) => any): void;
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp' {
  export class StreamableHTTPServerTransport {
    constructor(endpoint: string, res: any);
    sessionId: string;
    handlePostMessage(req: any, res: any, body: any): Promise<void>;
  }
}
// Stub for ESM import of Streamable HTTP server transport with .js extension
declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {
    constructor(endpoint: string, res: any);
    sessionId: string;
    handlePostMessage(req: any, res: any, body: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/sse' {
  export class SSEServerTransport {
    constructor(endpoint: string, res: any);
    sessionId: string;
    handlePostMessage(req: any, res: any, body: any): Promise<void>;
  }
}
// Stub for ESM import of SSE server transport with .js extension
declare module '@modelcontextprotocol/sdk/server/sse.js' {
  export class SSEServerTransport {
    constructor(endpoint: string, res: any);
    sessionId: string;
    handlePostMessage(req: any, res: any, body: any): Promise<void>;
  }
}

declare module "./CyberChef/src/node/index.mjs" {
  export function bake(input: string, recipe: any[]): { value: string };
}

// Allow importing JSON modules
declare module "*.json" {
  const value: any;
  export default value;
}

