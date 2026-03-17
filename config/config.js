import 'dotenv/config';

export const PORT = parseInt(process.env.PORT, 10);

if (!PORT || isNaN(PORT) || PORT <= 1000 || PORT >= 65535) {
  console.error(
    JSON.stringify({
      error:
        'Invalid PORT environment variable. Must be between 1001 and 65534.',
    }),
  );
  process.exit(1);
}

export const HOSTNAME = process.env.HOSTNAME;
if (!HOSTNAME) {
  console.error(
    JSON.stringify({ error: 'Invalid HOSTNAME environment variable.' }),
  );
  process.exit(1);
}

export const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV || !['development', 'production'].includes(NODE_ENV)) {
  console.error(
    JSON.stringify({
      error: "Invalid NODE_ENV. Must be 'development' or 'production'.",
    }),
  );
  process.exit(1);
}
