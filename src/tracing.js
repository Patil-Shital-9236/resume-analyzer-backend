const logger = require('./utils/logger');
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const serviceName = process.env.OTEL_SERVICE_NAME || "resume-analyzer-backend";
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";
const exporterMode = process.env.OTEL_TRACES_EXPORTER || "otlp";

let traceExporter;
if (exporterMode === "console") {
  traceExporter = new ConsoleSpanExporter();
} else {
  const headers = {};
  if (process.env.SIGNOZ_INGESTION_KEY) {
    headers["signoz-access-token"] = process.env.SIGNOZ_INGESTION_KEY;
  }
  traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint.endsWith("/v1/traces") ? otlpEndpoint : `${otlpEndpoint}/v1/traces`,
    headers
  });
}

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName
  }),
  spanProcessor: new BatchSpanProcessor(traceExporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }
    })
  ]
});

try {
  sdk.start();
  logger.info(`📡 OpenTelemetry (OTel) OTLP Exporter initialized for service: ${serviceName}`);
  logger.info(`📊 Traces destination: ${exporterMode === "console" ? "Console" : otlpEndpoint}`);
} catch (err) {
  logger.error("⚠️ Failed to initialize OpenTelemetry OTLP Exporter:", err.message);
}

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => logger.info("📡 OpenTelemetry shut down successfully."))
    .catch((err) => logger.error("⚠️ Error shutting down OpenTelemetry:", err))
    .finally(() => process.exit(0));
});

module.exports = sdk;
