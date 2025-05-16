# cyberchef-mcp-sse

This MCP server builds the cyberchef node API, exposes 3 tools and 1 prompt. Currently only supports sse

### Tools:

`cyberchef-ops-list` Returns a list of CyberChef operations that can be passed into cyberchef-bake.

`cyberchef-op-args` Given an operation name, returns its description and args.

`cyberchef-bake` Returns the cyberchef shareable URL and UTF-8 encoded text results of baking.

### Prompts:

`cyberchef-prompt` Explains and encourages the use of the tools.

