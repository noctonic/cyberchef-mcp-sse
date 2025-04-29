import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { bake } from "./CyberChef/src/node/index.mjs";
import rawOperations from "./CyberChef/src/core/config/OperationConfig.json" with { type: "json" };

const server = new McpServer({
  name: "cyberchef-mcp",
  version: "1.0.0"
});

function normalizeOpName(opName: string) {
  return opName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface OperationDefinition {
  module?: string;
  description?: string | null;
  infoURL?: string | null;  
  inputType?: string | null;
  outputType?: string | null;
  flowControl?: boolean | null;
  manualBake?: boolean | null;
  args?: unknown[] | null;
  checks?: unknown[] | null;
}

type OperationConfig = Record<string, OperationDefinition>;
const operations = rawOperations as OperationConfig;


server.tool(
  "cyberchef-ops-list",
  `Returns a list of CyberChef operations that can be passed into cyberchef-bake.
   Run cyberchef-op-args before choosing arguments.`,
  async (_extra) => {
    let ops = Object.keys(operations);

    return {
      content: [{ type: "text", text: JSON.stringify(ops) }]
    };
  }
);

const getOpsDetailsSchema = z.object({
  operationName: z.string()
});

const getOpsDetailsHandler = async ({ operationName }: { operationName: string }) => {
  console.log("[getOpsDetailsHandler] operationName:", operationName);

  const normalizedInput = normalizeOpName(operationName);

  const matchingOps = Object.entries(operations)
    .filter(([opName]) => normalizeOpName(opName) === normalizedInput)
    .map(([opName, opDef]) => ({
      name: opName,
      description: opDef.description,
      args: opDef.args
    }));

  console.log("[getOpsDetailsHandler] matchingOps:", JSON.stringify(matchingOps, null, 2));
  return {
    content: [{ type: "text", text: JSON.stringify(matchingOps, null, 2) }]
  };
};

server.tool(
  "cyberchef-op-args",
  `Given an operation name, returns its description and args.
    Acceptable arg types:
      stringSchema = z.string();
      shortStringSchema = z.string();
      binaryStringSchema = z.string();
      binaryShortStringSchema = z.string();
      textSchema = z.string();
      byteArraySchema = z.string();
      numberSchema = z.number();
      booleanSchema = z.boolean();
      optionSchema = z.string();
      editableOptionSchema = z.string();
      ceditableOptionShortSchema = z.string();
      argSelectorSchema = z.string();
      populateOptionSchema = z.literal("");
      populateMultiOptionSchema = z.literal("");
      toggleStringSchema = z.object({
        string: z.string(),
        option: z.string(),
      });`,
  { operationName: z.string() },
  getOpsDetailsHandler
);

function formatArgumentForCyberChef(arg: unknown): string {
  if (typeof arg === "string") {
    return `'${arg.replace(/'/g, "\\'")}'`;
  }
  if (typeof arg === "number" || typeof arg === "boolean") {
    return String(arg);
  }
  return JSON.stringify(arg).replace(/"/g, "'");
}

/**
 * Build a CyberChef URL from a series of operations/arguments.
 *
 *  1) Normalize each op name and find actual name in `operations`.
 *  2) Generate something like: "OP_NAME(arg1,arg2)Another_OP(arg1,arg2)"
 *  3) Encode the entire string, then *undo* the encoding for parentheses only.
 *
 * @param recipe - array of steps like [{ op: "ROT13", args: [true, ...] }, ...]
 * @param operations - your OperationConfig record
 */
function buildCyberChefUrl(
  recipe: { op: string; args?: unknown[] }[],
  operations: Record<string, unknown>
): string {
  // 1) Build the raw recipe string
  const recipeParts: string[] = [];
  for (const step of recipe) {
    const normalized = normalizeOpName(step.op);
    const actualOpName = Object.keys(operations).find(
      (opKey) => normalizeOpName(opKey) === normalized
    );
    if (!actualOpName) {
      throw new Error(`No matching operation for "${step.op}"`);
    }

    const argList = (step.args || []).map(formatArgumentForCyberChef).join(",");
    recipeParts.push(`${actualOpName}(${argList})`);
  }
  const rawRecipe = recipeParts.join("");

  // 2) Encode everything
  let encodedRecipe = encodeURIComponent(rawRecipe);

  // 3) Undo the parenthesis encoding
  encodedRecipe = encodedRecipe
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");

  return `https://gchq.github.io/CyberChef/#recipe=${encodedRecipe}`;
}


const stringSchema = z.string();
const shortStringSchema = z.string();
const binaryStringSchema = z.string();
const binaryShortStringSchema = z.string();
const textSchema = z.string();
const byteArraySchema = z.string();
const numberSchema = z.number();
const booleanSchema = z.boolean();
const optionSchema = z.string();
const editableOptionSchema = z.string();
const editableOptionShortSchema = z.string();
const argSelectorSchema = z.string();
const populateOptionSchema = z.literal("");
const populateMultiOptionSchema = z.literal("");
const toggleStringSchema = z.object({
  string: z.string(),
  option: z.string(),
});

const userArgValueSchema = z.union([
    stringSchema,
    shortStringSchema,
    binaryStringSchema,
    binaryShortStringSchema,
    textSchema,
    byteArraySchema,
    numberSchema,
    booleanSchema,
    optionSchema,
    argSelectorSchema,
    populateOptionSchema,
    populateMultiOptionSchema,
    editableOptionSchema,
    editableOptionShortSchema,
    toggleStringSchema,
]);

const userArgsSchema = z.array(userArgValueSchema);

const recipeItemSchema = z.object({
  op: z.string(),
  args: userArgsSchema,
});

const userRecipeSchema = z.array(recipeItemSchema);

const cyberchefBakeSchema = z.object({
    input: z.string(),
    recipe: userRecipeSchema
});
type BakeRecipeEntry = { op: string; args: unknown[] };

const cyberchefBakeHandler = async ({
    input,
    recipe,
  }: {
    input: string;
    recipe: { op: string; args?: unknown[] }[];
  }) => {
    // Convert each item to a BakeRecipeEntry (ensuring args is an array),
    // but also normalize the 'op' property:
    const typedRecipe: BakeRecipeEntry[] = recipe.map((item) => ({
      op: normalizeOpName(item.op),
      args: item.args ?? [],
    }));

    const result = bake(input, typedRecipe as any);

    let textOutput: string;
    if (typeof result.value === "string") {
      textOutput = result.value;
    } else if (
      Array.isArray(result.value) &&
      result.value.every((n: unknown): n is number => {
        return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 255;
      })
    ) {
      // If output is a byte array, convert it to a UTF-8 string
      textOutput = Buffer.from(result.value).toString("utf8");
    } else {
      // Otherwise, JSON-serialize the result
      textOutput = JSON.stringify(result.value);
    }
    const cyberchefUrl = buildCyberChefUrl(recipe, operations);

    return { content: [
      { type: "text", text: cyberchefUrl },
      { type: "text", text: textOutput }
    ] };
};

server.tool(
  "cyberchef-bake",
  `A recipe is composed of multiple "ingredients" (operataions)
  The "baking" applies each operation in order, returning the final result as text.
  Example: {"input":"NTMgNDUgNTYgNGQgNTQgNDUgMzggNjcgNTYgMzAgMzkgNTMgNTQgNDUgNTEgM2Q=",
  "recipe":[{"op":"From Base64","args":['A-Za-z0-9+/=',true,false]},
            {"op":"From Hex","args":['Space']},
            {"op":"From Base64","args":[]}]}]
  Run cyberchef-ops-list before choosing operations.
  Run cyberchef-op-args for each op before choosing arguments.
  Returns the cyberchef shareable URL and UTF-8 encoded text results of baking.
  `,
  { input: z.string(), recipe: userRecipeSchema },
  cyberchefBakeHandler
);


server.prompt(
  "cyberchef-prompt",
  {},
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `CyberChef - The Cyber Swiss Army Knife 
                  A tool for encryption, encoding, compression and data analysis. 
                  CyberChef allows you to chain together operations into a single
                  "recipe" before baking. Data is passed between operations in a 
                  recipe as raw bytes without re-encoding.


                  Steps for using CyberChef
                  1. List the availible operations
                  2. Get the arguments for operations you want to use
                  3. Construct a recipe of operations and arguments to crack the code.
                  4. You may run operations individually to check results.
                  5. Construct a single recipe to crack the code and run it to verify the results.
                  6. Provide the user with the recipe, results, and URL.

                  DO NOT ATTEMPT MANUAL DATA MANIPULATION ALWAYS USE THE TOOLS.
                  RECIPE OUTPUT IS UTF-8 ENCODED

          `
        }
      }
    ]
  })
);




const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(
    `[HTTP] ${req.method} ${req.originalUrl} Query=${JSON.stringify(req.query)} Body=${JSON.stringify(req.body)}`
  );
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} => ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Streamable HTTP endpoint placeholder
app.all('/mcp', async (req, res) => {
  console.log(`[MCP HTTP] ${req.method} ${req.originalUrl}`);
});

// SSE endpoint
app.get('/sse', async (req, res) => {
  console.log(`[SSE] New connection from ${req.ip}`);
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });
  await server.connect(transport);
});

// Message endpoint
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

// Start server
app.listen(8080, () => {
  console.log(`Server listening on port 8080`);
});
